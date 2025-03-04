using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Polly;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Audit;
using Ardalis.GuardClauses;
using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using ServiceProvider.Core.Domain.Inspectors;

namespace ServiceProvider.Infrastructure.Data.Repositories
{
    /// <summary>
    /// Implements secure and optimized data access operations for DrugTest entities with comprehensive 
    /// error handling, caching, and audit logging capabilities.
    /// </summary>
    public sealed class DrugTestRepository : IDrugTestRepository
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<DrugTestRepository> _logger;
        private readonly IDistributedCache _cache;
        private readonly IAsyncPolicy _retryPolicy;

        private const string CACHE_KEY_PREFIX = "drugtest_";
        private const int CACHE_DURATION_MINUTES = 30;
        private static readonly TimeSpan RETRY_TIMEOUT = TimeSpan.FromSeconds(30);

        /// <summary>
        /// Initializes a new instance of the DrugTestRepository with required dependencies.
        /// </summary>
        /// <param name="context">The application database context</param>
        /// <param name="logger">Logger for tracking operations</param>
        /// <param name="cache">Distributed cache for caching drug test data</param>
        public DrugTestRepository(
            IApplicationDbContext context,
            ILogger<DrugTestRepository> logger,
            IDistributedCache cache)
        {
            Guard.Against.Null(context, nameof(context));
            Guard.Against.Null(logger, nameof(logger));
            Guard.Against.Null(cache, nameof(cache));

            _context = context;
            _logger = logger;
            _cache = cache;

            // Configure retry policy for transient failures
            _retryPolicy = Policy
                .Handle<DbUpdateException>()
                .Or<TimeoutException>()
                .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
        }

        /// <summary>
        /// Retrieves a DrugTest by ID with caching and comprehensive error handling.
        /// </summary>
        /// <param name="id">The DrugTest ID to retrieve</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>The DrugTest entity if found, null otherwise</returns>
        public async Task<DrugTest> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        {
            try
            {
                var cacheKey = $"{CACHE_KEY_PREFIX}{id}";
                var cachedDrugTest = await _cache.GetStringAsync(cacheKey, cancellationToken);

                if (!string.IsNullOrEmpty(cachedDrugTest))
                {
                    _logger.LogDebug("Cache hit for DrugTest ID: {DrugTestId}", id);
                    return JsonSerializer.Deserialize<DrugTest>(cachedDrugTest);
                }

                var drugTest = await _retryPolicy.ExecuteAsync(async () =>
                    await _context.DrugTests.FirstOrDefaultAsync(dt => dt.Id == id, cancellationToken));

                if (drugTest != null)
                {
                    await _cache.SetStringAsync(
                        cacheKey,
                        JsonSerializer.Serialize(drugTest),
                        new DistributedCacheEntryOptions
                        {
                            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(CACHE_DURATION_MINUTES)
                        },
                        cancellationToken);

                    await LogDrugTestAccess(drugTest.Id, "Read", cancellationToken);
                }

                return drugTest;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving DrugTest with ID: {DrugTestId}", id);
                throw;
            }
        }

        /// <summary>
        /// Creates a new DrugTest entity with comprehensive validation and caching measures.
        /// </summary>
        /// <param name="drugTest">The DrugTest entity to create</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>The created DrugTest entity with an assigned ID</returns>
        public async Task<DrugTest> CreateAsync(DrugTest drugTest, CancellationToken cancellationToken = default)
        {
            Guard.Against.Null(drugTest, nameof(drugTest));

            try
            {
                await _retryPolicy.ExecuteAsync(async () =>
                {
                    _context.DrugTests.Add(drugTest);
                    await _context.SaveChangesAsync(cancellationToken);
                    return drugTest;
                });

                await LogDrugTestAccess(drugTest.Id, "Create", cancellationToken);

                await InvalidateDrugTestCache(drugTest.Id, cancellationToken);

                return drugTest;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating DrugTest with ID: {DrugTestId}", drugTest.Id);
                throw;
            }
        }

        /// <summary>
        /// Updates an existing DrugTest entity with optimistic concurrency and caching measures.
        /// </summary>
        /// <param name="drugTest">The DrugTest entity to update</param>
        /// <param name="cancellationToken">Cancellation token</param>
        public async Task UpdateAsync(DrugTest drugTest, CancellationToken cancellationToken = default)
        {
            Guard.Against.Null(drugTest, nameof(drugTest));

            try
            {
                await _retryPolicy.ExecuteAsync(async () =>
                {
                    _context.DrugTests.Update(drugTest);
                    await _context.SaveChangesAsync(cancellationToken);
                    return drugTest;
                });

                await LogDrugTestAccess(drugTest.Id, "Update", cancellationToken);

                await InvalidateDrugTestCache(drugTest.Id, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating DrugTest with ID: {DrugTestId}", drugTest.Id);
                throw;
            }
        }

        private async Task LogDrugTestAccess(int drugTestId, string action, CancellationToken cancellationToken)
        {
            var auditLog = new AuditLog(
                entityName: "DrugTest",
                entityId: drugTestId.ToString(),
                action: action,
                changes: JsonSerializer.Serialize(new { DrugTestId = drugTestId, Action = action }),
                ipAddress: "::1", // Replace with actual IP in production
                userId: 0 // Adjust as needed if user context is available
            );

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync(cancellationToken);
        }

        private async Task InvalidateDrugTestCache(int drugTestId, CancellationToken cancellationToken)
        {
            var cacheKey = $"{CACHE_KEY_PREFIX}{drugTestId}";
            await _cache.RemoveAsync(cacheKey, cancellationToken);
        }
    }
    
}
