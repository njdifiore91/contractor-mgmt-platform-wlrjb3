using System;
using System.Threading;
using System.Threading.Tasks;
using System.Diagnostics;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using Ardalis.GuardClauses;
using ServiceProvider.Core.Domain.Equipment;
using ServiceProvider.Core.Abstractions;

namespace ServiceProvider.Services.Equipment.Queries
{
    /// <summary>
    /// CQRS query request for retrieving equipment details by ID with enhanced validation and security checks.
    /// </summary>
    public class GetEquipmentByIdQuery : IRequest<Equipment>
    {
        /// <summary>
        /// Gets the unique identifier of the equipment to retrieve.
        /// </summary>
        public int Id { get; }

        /// <summary>
        /// Initializes a new instance of GetEquipmentByIdQuery with comprehensive validation.
        /// </summary>
        /// <param name="id">Equipment identifier</param>
        /// <exception cref="ArgumentException">Thrown when id is invalid</exception>
        public GetEquipmentByIdQuery(int id)
        {
            Guard.Against.NegativeOrZero(id, nameof(id));
            Guard.Against.OutOfRange(id, nameof(id), 1, int.MaxValue);
            Id = id;
        }
    }

    /// <summary>
    /// Handler for processing equipment retrieval by ID queries with optimized performance and security measures.
    /// Implements caching, performance tracking, and comprehensive error handling.
    /// </summary>
    public class GetEquipmentByIdQueryHandler : IRequestHandler<GetEquipmentByIdQuery, Equipment>
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<GetEquipmentByIdQueryHandler> _logger;
        private readonly IMemoryCache _cache;
        private const string CacheKeyPrefix = "Equipment_";
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(15);
        private static readonly TimeSpan QueryTimeout = TimeSpan.FromSeconds(30);

        /// <summary>
        /// Initializes a new instance of GetEquipmentByIdQueryHandler with dependency injection.
        /// </summary>
        public GetEquipmentByIdQueryHandler(
            IApplicationDbContext context,
            ILogger<GetEquipmentByIdQueryHandler> logger,
            IMemoryCache cache)
        {
            _context = Guard.Against.Null(context, nameof(context));
            _logger = Guard.Against.Null(logger, nameof(logger));
            _cache = Guard.Against.Null(cache, nameof(cache));
        }

        /// <summary>
        /// Handles the equipment retrieval query with caching and performance optimization.
        /// </summary>
        /// <param name="request">Query request containing equipment ID</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Retrieved equipment entity or null if not found</returns>
        /// <exception cref="OperationCanceledException">Thrown when operation is canceled</exception>
        public async Task<Equipment> Handle(GetEquipmentByIdQuery request, CancellationToken cancellationToken)
        {
            Guard.Against.Null(request, nameof(request));

            var cacheKey = $"{CacheKeyPrefix}{request.Id}";

            using var activity = new Activity(nameof(GetEquipmentByIdQueryHandler))
                .SetTag("EquipmentId", request.Id)
                .Start();

            try
            {
                // Check cache first
                if (_cache.TryGetValue(cacheKey, out Equipment cachedEquipment))
                {
                    _logger.LogInformation("Cache hit for equipment ID {EquipmentId}", request.Id);
                    return cachedEquipment;
                }

                // Set up query with timeout
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(QueryTimeout);

                // Build optimized query with necessary includes
                var query = _context.Equipment
                    .AsNoTracking()
                    .Include(e => e.Assignments)
                    .Include(e => e.History)
                    .Where(e => e.Id == request.Id);

                // Execute query with timeout protection
                var equipment = await query.FirstOrDefaultAsync(cts.Token);

                if (equipment != null)
                {
                    // Cache successful result
                    var cacheOptions = new MemoryCacheEntryOptions()
                        .SetAbsoluteExpiration(CacheDuration)
                        .SetPriority(CacheItemPriority.High);

                    _cache.Set(cacheKey, equipment, cacheOptions);

                    _logger.LogInformation("Successfully retrieved equipment ID {EquipmentId}", request.Id);
                }
                else
                {
                    _logger.LogWarning("Equipment with ID {EquipmentId} not found", request.Id);
                }

                return equipment;
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogError("Query timeout for equipment ID {EquipmentId}", request.Id);
                throw new TimeoutException($"Query timeout for equipment ID {request.Id}");
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Error retrieving equipment ID {EquipmentId}", request.Id);
                throw;
            }
            finally
            {
                activity?.Stop();
            }
        }
    }
}