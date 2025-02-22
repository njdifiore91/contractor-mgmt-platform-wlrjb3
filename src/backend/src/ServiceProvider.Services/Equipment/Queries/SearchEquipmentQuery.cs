using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Equipment;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ServiceProvider.Services.Equipment.Queries
{
    /// <summary>
    /// Query class for searching equipment with comprehensive filtering and pagination support
    /// </summary>
    public class SearchEquipmentQuery : IRequest<PaginatedList<EquipmentDto>>
    {
        public string SerialNumber { get; }
        public EquipmentType? Type { get; }
        public bool? IsAvailable { get; }
        public int PageNumber { get; }
        public int PageSize { get; }

        public SearchEquipmentQuery(
            string serialNumber = null,
            EquipmentType? type = null,
            bool? isAvailable = null,
            int pageNumber = 1,
            int pageSize = 10)
        {
            if (pageNumber < 1)
                throw new ArgumentException("Page number must be greater than 0", nameof(pageNumber));

            if (pageSize < 1 || pageSize > 100)
                throw new ArgumentException("Page size must be between 1 and 100", nameof(pageSize));

            SerialNumber = serialNumber?.Trim();
            Type = type;
            IsAvailable = isAvailable;
            PageNumber = pageNumber;
            PageSize = pageSize;
        }
    }

    /// <summary>
    /// Handler for processing equipment search queries with optimized performance and caching
    /// </summary>
    public class SearchEquipmentQueryHandler : IRequestHandler<SearchEquipmentQuery, PaginatedList<EquipmentDto>>
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<SearchEquipmentQueryHandler> _logger;
        private readonly IMemoryCache _cache;
        private const string CacheKeyPrefix = "EquipmentSearch_";
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

        public SearchEquipmentQueryHandler(
            IApplicationDbContext context,
            ILogger<SearchEquipmentQueryHandler> logger,
            IMemoryCache cache)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        }

        public async Task<PaginatedList<EquipmentDto>> Handle(
            SearchEquipmentQuery request,
            CancellationToken cancellationToken)
        {
            try
            {
                var cacheKey = GenerateCacheKey(request);
                if (_cache.TryGetValue(cacheKey, out PaginatedList<EquipmentDto> cachedResult))
                {
                    _logger.LogInformation("Returning cached equipment search results for key: {CacheKey}", cacheKey);
                    return cachedResult;
                }

                var query = _context.Equipment
                    .AsNoTracking()
                    .Include(e => e.Assignments.Where(a => !a.ReturnDate.HasValue))
                    .AsQueryable();

                // Apply filters
                if (!string.IsNullOrWhiteSpace(request.SerialNumber))
                {
                    query = query.Where(e => e.SerialNumber.Contains(request.SerialNumber));
                }

                if (request.Type.HasValue)
                {
                    query = query.Where(e => e.Type == request.Type.Value);
                }

                if (request.IsAvailable.HasValue)
                {
                    query = query.Where(e => e.IsAvailable == request.IsAvailable.Value);
                }

                // Get total count efficiently
                var totalCount = await query.CountAsync(cancellationToken);

                // Apply pagination with optimized query
                var equipmentItems = await query
                    .OrderBy(e => e.SerialNumber)
                    .Skip((request.PageNumber - 1) * request.PageSize)
                    .Take(request.PageSize)
                    .Select(e => new EquipmentDto
                    {
                        Id = e.Id,
                        SerialNumber = e.SerialNumber,
                        Model = e.Model,
                        Type = e.Type,
                        Condition = e.Condition,
                        IsAvailable = e.IsAvailable,
                        IsActive = e.IsActive,
                        PurchaseDate = e.PurchaseDate,
                        LastMaintenanceDate = e.LastMaintenanceDate,
                        CurrentAssignment = e.Assignments
                            .Where(a => !a.ReturnDate.HasValue)
                            .Select(a => new EquipmentAssignmentDto
                            {
                                InspectorId = a.InspectorId,
                                AssignmentDate = a.AssignmentDate,
                                ConditionOnAssignment = a.ConditionOnAssignment
                            })
                            .FirstOrDefault()
                    })
                    .ToListAsync(cancellationToken);

                var result = new PaginatedList<EquipmentDto>(
                    equipmentItems,
                    totalCount,
                    request.PageNumber,
                    request.PageSize);

                // Cache the results
                var cacheEntryOptions = new MemoryCacheEntryOptions()
                    .SetSlidingExpiration(CacheDuration)
                    .SetPriority(CacheItemPriority.Normal);

                _cache.Set(cacheKey, result, cacheEntryOptions);

                _logger.LogInformation(
                    "Equipment search completed. Total: {TotalCount}, Page: {PageNumber}, Size: {PageSize}",
                    totalCount, request.PageNumber, request.PageSize);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while searching equipment");
                throw;
            }
        }

        private string GenerateCacheKey(SearchEquipmentQuery request)
        {
            return $"{CacheKeyPrefix}{request.SerialNumber}_{request.Type}_{request.IsAvailable}_{request.PageNumber}_{request.PageSize}";
        }
    }

    public class EquipmentDto
    {
        public int Id { get; set; }
        public string SerialNumber { get; set; }
        public string Model { get; set; }
        public EquipmentType Type { get; set; }
        public string Condition { get; set; }
        public bool IsAvailable { get; set; }
        public bool IsActive { get; set; }
        public DateTime PurchaseDate { get; set; }
        public DateTime? LastMaintenanceDate { get; set; }
        public EquipmentAssignmentDto CurrentAssignment { get; set; }
    }

    public class EquipmentAssignmentDto
    {
        public int InspectorId { get; set; }
        public DateTime AssignmentDate { get; set; }
        public string ConditionOnAssignment { get; set; }
    }

    public class PaginatedList<T>
    {
        public List<T> Items { get; }
        public int PageNumber { get; }
        public int TotalPages { get; }
        public int TotalCount { get; }
        public bool HasPreviousPage => PageNumber > 1;
        public bool HasNextPage => PageNumber < TotalPages;

        public PaginatedList(List<T> items, int count, int pageNumber, int pageSize)
        {
            Items = items;
            PageNumber = pageNumber;
            TotalCount = count;
            TotalPages = (int)Math.Ceiling(count / (double)pageSize);
        }
    }
}