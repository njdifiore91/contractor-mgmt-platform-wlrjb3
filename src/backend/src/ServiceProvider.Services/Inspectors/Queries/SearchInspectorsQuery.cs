using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation; // v11.0.0
using MediatR; // v11.0.0
using Microsoft.Extensions.Caching.Memory; // v6.0.0
using Microsoft.Extensions.Logging;
using Microsoft.Spatial;
using ServiceProvider.Core.Abstractions; // v7.12.2
using ServiceProvider.Core.Domain.Inspectors;
using ServiceProvider.Infrastructure.Data.Repositories;

namespace ServiceProvider.Services.Inspectors.Queries
{
    /// <summary>
    /// CQRS query for searching inspectors with advanced geographic and filtering capabilities.
    /// Implements comprehensive validation and caching for optimal performance.
    /// </summary>
    public class SearchInspectorsQuery : IRequest<PaginatedList<InspectorDto>>
    {
        public GeographyPoint Location { get; }
        public double RadiusInMiles { get; }
        public InspectorStatus? Status { get; set; }
        public List<string> RequiredCertifications { get; set; }
        public bool? IsActive { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SortBy { get; set; }
        public bool SortDescending { get; set; }

        public SearchInspectorsQuery(GeographyPoint location, double radiusInMiles)
        {
            Location = location ?? throw new ArgumentNullException(nameof(location));
            RadiusInMiles = radiusInMiles;
            RequiredCertifications = new List<string>();
            PageNumber = 1;
            PageSize = 10;
            SortBy = "Distance";
            SortDescending = false;
        }
    }

    /// <summary>
    /// Validator for SearchInspectorsQuery ensuring data integrity and query performance.
    /// </summary>
    public class SearchInspectorsQueryValidator : AbstractValidator<SearchInspectorsQuery>
    {
        private const double MaxLatitude = 90.0;
        private const double MinLatitude = -90.0;
        private const double MaxLongitude = 180.0;
        private const double MinLongitude = -180.0;
        private const double MinRadius = 1.0;
        private const double MaxRadius = 500.0;
        private const int MaxPageSize = 100;
        private readonly string[] ValidSortFields = { "Distance", "LastName", "Status", "LastDrugTestDate" };

        public SearchInspectorsQueryValidator()
        {
            RuleFor(q => q.Location)
                .NotNull()
                .WithMessage("Search location is required.");

            RuleFor(q => q.Location.Latitude)
                .InclusiveBetween(MinLatitude, MaxLatitude)
                .WithMessage($"Latitude must be between {MinLatitude} and {MaxLatitude}.");

            RuleFor(q => q.Location.Longitude)
                .InclusiveBetween(MinLongitude, MaxLongitude)
                .WithMessage($"Longitude must be between {MinLongitude} and {MaxLongitude}.");

            RuleFor(q => q.RadiusInMiles)
                .InclusiveBetween(MinRadius, MaxRadius)
                .WithMessage($"Search radius must be between {MinRadius} and {MaxRadius} miles.");

            RuleFor(q => q.PageNumber)
                .GreaterThan(0)
                .WithMessage("Page number must be greater than 0.");

            RuleFor(q => q.PageSize)
                .InclusiveBetween(1, MaxPageSize)
                .WithMessage($"Page size must be between 1 and {MaxPageSize}.");

            RuleFor(q => q.SortBy)
                .Must(sortBy => ValidSortFields.Contains(sortBy))
                .WithMessage($"Sort field must be one of: {string.Join(", ", ValidSortFields)}");

            RuleFor(q => q.RequiredCertifications)
                .Must(certs => certs == null || certs.Count <= 10)
                .WithMessage("Maximum of 10 required certifications allowed.");
        }
    }

    /// <summary>
    /// Handler for SearchInspectorsQuery implementing caching and optimized geographic search.
    /// </summary>
    public class SearchInspectorsQueryHandler : IRequestHandler<SearchInspectorsQuery, PaginatedList<InspectorDto>>
    {
        private readonly IInspectorRepository _inspectorRepository;
        private readonly ILogger<SearchInspectorsQueryHandler> _logger;
        private readonly IMemoryCache _cache;
        private readonly SearchInspectorsQueryValidator _validator;

        public SearchInspectorsQueryHandler(
            IInspectorRepository inspectorRepository,
            ILogger<SearchInspectorsQueryHandler> logger,
            IMemoryCache cache)
        {
            _inspectorRepository = inspectorRepository ?? throw new ArgumentNullException(nameof(inspectorRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _cache = cache ?? throw new ArgumentNullException(nameof(cache));
            _validator = new SearchInspectorsQueryValidator();
        }

        public async Task<PaginatedList<InspectorDto>> Handle(
            SearchInspectorsQuery request,
            CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation(
                    "Processing inspector search at coordinates ({Latitude}, {Longitude}) within {Radius} miles",
                    request.Location.Latitude,
                    request.Location.Longitude,
                    request.RadiusInMiles);

                // Validate request
                var validationResult = await _validator.ValidateAsync(request, cancellationToken);
                if (!validationResult.IsValid)
                {
                    throw new ValidationException(validationResult.Errors);
                }

                // Check cache
                var cacheKey = GenerateCacheKey(request);
                if (_cache.TryGetValue(cacheKey, out PaginatedList<InspectorDto> cachedResult))
                {
                    _logger.LogDebug("Returning cached search results for key: {CacheKey}", cacheKey);
                    return cachedResult;
                }

                // Execute search
                var inspectors = await _inspectorRepository.SearchByLocationAsync(
                    request.Location,
                    request.RadiusInMiles);

                // Apply filters
                var filteredInspectors = ApplyFilters(inspectors, request);

                // Apply sorting
                var sortedInspectors = ApplySorting(filteredInspectors, request);

                // Create paginated result
                var totalCount = sortedInspectors.Count;
                var paginatedInspectors = sortedInspectors
                    .Skip((request.PageNumber - 1) * request.PageSize)
                    .Take(request.PageSize);

                // Map to DTOs
                var inspectorDtos = MapToDto(paginatedInspectors, request.Location);

                var result = new PaginatedList<InspectorDto>(
                    inspectorDtos,
                    totalCount,
                    request.PageNumber,
                    request.PageSize);

                // Cache results
                var cacheOptions = new MemoryCacheEntryOptions()
                    .SetSlidingExpiration(TimeSpan.FromMinutes(5))
                    .SetAbsoluteExpiration(TimeSpan.FromMinutes(30));

                _cache.Set(cacheKey, result, cacheOptions);

                _logger.LogInformation(
                    "Inspector search completed. Found {TotalCount} inspectors, returning page {PageNumber}",
                    totalCount,
                    request.PageNumber);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing inspector search request");
                throw;
            }
        }

        private string GenerateCacheKey(SearchInspectorsQuery request)
        {
            return $"InspectorSearch_{request.Location.Latitude}_{request.Location.Longitude}_{request.RadiusInMiles}" +
                   $"_{request.Status}_{request.IsActive}_{request.PageNumber}_{request.PageSize}" +
                   $"_{request.SortBy}_{request.SortDescending}" +
                   $"_{string.Join(",", request.RequiredCertifications ?? new List<string>())}";
        }

        private List<Inspector> ApplyFilters(IEnumerable<Inspector> inspectors, SearchInspectorsQuery request)
        {
            var filtered = inspectors.ToList();

            if (request.Status.HasValue)
            {
                filtered = filtered.Where(i => i.Status == request.Status.Value).ToList();
            }

            if (request.IsActive.HasValue)
            {
                filtered = filtered.Where(i => i.IsActive == request.IsActive.Value).ToList();
            }

            if (request.RequiredCertifications?.Any() == true)
            {
                filtered = filtered.Where(i => 
                    request.RequiredCertifications.All(rc => 
                        i.Certifications.Any(c => c.Name.Equals(rc, StringComparison.OrdinalIgnoreCase))
                    )).ToList();
            }

            return filtered;
        }

        private List<Inspector> ApplySorting(List<Inspector> inspectors, SearchInspectorsQuery request)
        {
            return request.SortBy.ToLowerInvariant() switch
            {
                //"distance" => request.SortDescending
                //    ? inspectors.OrderByDescending(i => i.Location.Distance(request.Location)).ToList()
                //    : inspectors.OrderBy(i => i.Location.Distance(request.Location)).ToList(),
                
                "lastname" => request.SortDescending
                    ? inspectors.OrderByDescending(i => i.User.LastName).ToList()
                    : inspectors.OrderBy(i => i.User.LastName).ToList(),
                
                "status" => request.SortDescending
                    ? inspectors.OrderByDescending(i => i.Status).ToList()
                    : inspectors.OrderBy(i => i.Status).ToList(),
                
                "lastdrugtestdate" => request.SortDescending
                    ? inspectors.OrderByDescending(i => i.LastDrugTestDate).ToList()
                    : inspectors.OrderBy(i => i.LastDrugTestDate).ToList(),
                
                _ => inspectors
            };
        }

        private List<InspectorDto> MapToDto(IEnumerable<Inspector> inspectors, GeographyPoint searchLocation)
        {
            var dtos = new List<InspectorDto>();
            foreach (var inspector in inspectors)
            {
                dtos.Add(new InspectorDto
                {
                    Id = inspector.Id,
                    FirstName = inspector.User.FirstName,
                    LastName = inspector.User.LastName,
                    Status = inspector.Status,
                    //Location = inspector.Location,
                    //DistanceInMiles = Math.Round(inspector.Location.Distance(searchLocation) / 1609.34, 2), // Convert meters to miles
                    Certifications = inspector.Certifications.Select(c => c.Name).ToList(),
                    LastDrugTestDate = inspector.LastDrugTestDate,
                    IsActive = inspector.IsActive
                });
            }
            return dtos;
        }
    }

    public class PaginatedList<T>
    {
        public List<T> Items { get; }
        public int TotalCount { get; }
        public int PageNumber { get; }
        public int TotalPages { get; }
        public bool HasPreviousPage => PageNumber > 1;
        public bool HasNextPage => PageNumber < TotalPages;

        public PaginatedList(List<T> items, int totalCount, int pageNumber, int pageSize)
        {
            Items = items;
            TotalCount = totalCount;
            PageNumber = pageNumber;
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        }
    }

    public class InspectorDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public InspectorStatus Status { get; set; }
        public GeographyPoint Location { get; set; }
        public double DistanceInMiles { get; set; }
        public List<string> Certifications { get; set; }
        public DateTime? LastDrugTestDate { get; set; }
        public bool IsActive { get; set; }
    }
}
