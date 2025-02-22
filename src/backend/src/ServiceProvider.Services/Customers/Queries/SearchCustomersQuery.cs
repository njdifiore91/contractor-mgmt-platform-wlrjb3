using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Customers;

namespace ServiceProvider.Services.Customers.Queries
{
    /// <summary>
    /// Represents a query for searching customers with comprehensive filtering, sorting and pagination.
    /// </summary>
    public class SearchCustomersQuery : IRequest<IEnumerable<Customer>>
    {
        private static readonly Regex SearchTermPattern = new(@"^[a-zA-Z0-9\s-]{0,50}$", RegexOptions.Compiled);
        private static readonly HashSet<string> ValidRegions = new() { "North", "South", "East", "West" };
        private static readonly HashSet<string> ValidSortFields = new() { "name", "code", "region", "createdAt" };

        public string SearchTerm { get; }
        public string Region { get; }
        public bool? IsActive { get; }
        public int Page { get; }
        public int PageSize { get; }
        public string SortBy { get; }
        public bool SortDescending { get; }
        public string CacheKey { get; }

        public SearchCustomersQuery(
            string searchTerm,
            string region,
            bool? isActive,
            int page,
            int pageSize,
            string sortBy = "name",
            bool sortDescending = false)
        {
            // Validate search term
            if (!string.IsNullOrEmpty(searchTerm) && !SearchTermPattern.IsMatch(searchTerm))
            {
                throw new ArgumentException("Search term contains invalid characters or exceeds length limit.", nameof(searchTerm));
            }

            // Validate region
            if (!string.IsNullOrEmpty(region) && !ValidRegions.Contains(region))
            {
                throw new ArgumentException($"Invalid region. Valid values are: {string.Join(", ", ValidRegions)}", nameof(region));
            }

            // Validate pagination
            if (page <= 0)
            {
                throw new ArgumentException("Page must be greater than 0.", nameof(page));
            }

            if (pageSize < 1 || pageSize > 100)
            {
                throw new ArgumentException("Page size must be between 1 and 100.", nameof(pageSize));
            }

            // Validate sorting
            if (!ValidSortFields.Contains(sortBy.ToLower()))
            {
                throw new ArgumentException($"Invalid sort field. Valid values are: {string.Join(", ", ValidSortFields)}", nameof(sortBy));
            }

            SearchTerm = searchTerm?.Trim();
            Region = region?.Trim();
            IsActive = isActive;
            Page = page;
            PageSize = pageSize;
            SortBy = sortBy.ToLower();
            SortDescending = sortDescending;

            // Generate cache key based on query parameters
            CacheKey = $"customers_search_{SearchTerm}_{Region}_{IsActive}_{Page}_{PageSize}_{SortBy}_{SortDescending}";
        }
    }

    /// <summary>
    /// Handles the customer search query with caching and optimized database access.
    /// </summary>
    public class SearchCustomersQueryHandler : IRequestHandler<SearchCustomersQuery, IEnumerable<Customer>>
    {
        private readonly IApplicationDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<SearchCustomersQueryHandler> _logger;
        private readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(5);
        private readonly TimeSpan _queryTimeout = TimeSpan.FromSeconds(30);

        public SearchCustomersQueryHandler(
            IApplicationDbContext context,
            IMemoryCache cache,
            ILogger<SearchCustomersQueryHandler> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _cache = cache ?? throw new ArgumentNullException(nameof(cache));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<IEnumerable<Customer>> Handle(SearchCustomersQuery request, CancellationToken cancellationToken)
        {
            try
            {
                // Check cache first
                if (_cache.TryGetValue(request.CacheKey, out IEnumerable<Customer> cachedResult))
                {
                    _logger.LogInformation("Returning cached customer search results for key: {CacheKey}", request.CacheKey);
                    return cachedResult;
                }

                // Build query with index hints
                var query = _context.Customers
                    .TagWith("Customer_Search_Query")
                    .AsNoTracking();

                // Apply filters
                if (!string.IsNullOrEmpty(request.SearchTerm))
                {
                    query = query.Where(c => 
                        c.Name.Contains(request.SearchTerm) || 
                        c.Code.Contains(request.SearchTerm));
                }

                if (!string.IsNullOrEmpty(request.Region))
                {
                    query = query.Where(c => c.Region == request.Region);
                }

                if (request.IsActive.HasValue)
                {
                    query = query.Where(c => c.IsActive == request.IsActive.Value);
                }

                // Apply sorting
                query = request.SortBy switch
                {
                    "name" => request.SortDescending 
                        ? query.OrderByDescending(c => c.Name)
                        : query.OrderBy(c => c.Name),
                    "code" => request.SortDescending
                        ? query.OrderByDescending(c => c.Code)
                        : query.OrderBy(c => c.Code),
                    "region" => request.SortDescending
                        ? query.OrderByDescending(c => c.Region)
                        : query.OrderBy(c => c.Region),
                    "createdAt" => request.SortDescending
                        ? query.OrderByDescending(c => c.CreatedAt)
                        : query.OrderBy(c => c.CreatedAt),
                    _ => query.OrderBy(c => c.Name)
                };

                // Apply pagination
                query = query
                    .Skip((request.Page - 1) * request.PageSize)
                    .Take(request.PageSize);

                // Execute query with timeout
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(_queryTimeout);

                var results = await query.ToListAsync(cts.Token);

                // Cache the results
                var cacheOptions = new MemoryCacheEntryOptions()
                    .SetSlidingExpiration(_cacheExpiration)
                    .SetPriority(CacheItemPriority.Normal);

                _cache.Set(request.CacheKey, results, cacheOptions);

                _logger.LogInformation(
                    "Customer search completed. Found {Count} results for search term: {SearchTerm}, Region: {Region}, Page: {Page}",
                    results.Count,
                    request.SearchTerm,
                    request.Region,
                    request.Page);

                return results;
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Customer search query timed out after {Timeout} seconds", _queryTimeout.TotalSeconds);
                throw new TimeoutException($"The search operation timed out after {_queryTimeout.TotalSeconds} seconds.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing customer search query");
                throw;
            }
        }
    }
}