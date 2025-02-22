using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Polly;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Users;
using ServiceProvider.Core.Domain.Audit;
using System;
using System.Text.Json;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using Ardalis.GuardClauses;

namespace ServiceProvider.Infrastructure.Data.Repositories
{
    /// <summary>
    /// Implements secure and optimized data access operations for User entities with comprehensive 
    /// error handling, caching, and audit logging capabilities.
    /// </summary>
    public sealed class UserRepository
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<UserRepository> _logger;
        private readonly IDistributedCache _cache;
        private readonly IAsyncPolicy _retryPolicy;

        private const string CACHE_KEY_PREFIX = "user_";
        private const int CACHE_DURATION_MINUTES = 30;
        private static readonly TimeSpan RETRY_TIMEOUT = TimeSpan.FromSeconds(30);

        /// <summary>
        /// Initializes a new instance of the UserRepository class with required dependencies.
        /// </summary>
        public UserRepository(
            IApplicationDbContext context,
            ILogger<UserRepository> logger,
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
                .WaitAndRetryAsync(3, retryAttempt => 
                    TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
        }

        /// <summary>
        /// Retrieves a user by ID with caching and comprehensive error handling.
        /// </summary>
        /// <param name="id">The user ID to retrieve</param>
        /// <returns>User entity if found, null otherwise</returns>
        public async Task<User> GetByIdAsync(int id)
        {
            try
            {
                // Check cache first
                var cacheKey = $"{CACHE_KEY_PREFIX}{id}";
                var cachedUser = await _cache.GetStringAsync(cacheKey);
                
                if (!string.IsNullOrEmpty(cachedUser))
                {
                    _logger.LogDebug("Cache hit for user ID: {UserId}", id);
                    return JsonSerializer.Deserialize<User>(cachedUser);
                }

                // Query database with retry policy
                var user = await _retryPolicy.ExecuteAsync(async () =>
                    await _context.Users
                        .Include(u => u.UserRoles)
                        .FirstOrDefaultAsync(u => u.Id == id));

                if (user != null)
                {
                    // Cache the result
                    await _cache.SetStringAsync(
                        cacheKey,
                        JsonSerializer.Serialize(user),
                        new DistributedCacheEntryOptions
                        {
                            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(CACHE_DURATION_MINUTES)
                        });

                    // Log access for audit
                    await LogUserAccess(user.Id, "Read");
                }

                return user;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user with ID: {UserId}", id);
                throw;
            }
        }

        /// <summary>
        /// Retrieves a user by email with case-insensitive matching and security measures.
        /// </summary>
        /// <param name="email">The email address to search for</param>
        /// <returns>User entity if found, null otherwise</returns>
        public async Task<User> GetByEmailAsync(string email)
        {
            Guard.Against.NullOrWhiteSpace(email, nameof(email));

            try
            {
                var normalizedEmail = email.ToUpperInvariant();
                var cacheKey = $"{CACHE_KEY_PREFIX}email_{normalizedEmail}";

                // Check cache first
                var cachedUser = await _cache.GetStringAsync(cacheKey);
                if (!string.IsNullOrEmpty(cachedUser))
                {
                    _logger.LogDebug("Cache hit for user email: {Email}", email);
                    return JsonSerializer.Deserialize<User>(cachedUser);
                }

                // Query database with retry policy
                var user = await _retryPolicy.ExecuteAsync(async () =>
                    await _context.Users
                        .Include(u => u.UserRoles)
                        .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail));

                if (user != null)
                {
                    // Cache the result
                    await _cache.SetStringAsync(
                        cacheKey,
                        JsonSerializer.Serialize(user),
                        new DistributedCacheEntryOptions
                        {
                            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(CACHE_DURATION_MINUTES)
                        });

                    // Log access for audit
                    await LogUserAccess(user.Id, "Read");
                }

                return user;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user with email: {Email}", email);
                throw;
            }
        }

        /// <summary>
        /// Creates a new user with comprehensive validation and security measures.
        /// </summary>
        /// <param name="user">The user entity to create</param>
        /// <returns>Created user with assigned ID</returns>
        public async Task<User> CreateAsync(User user)
        {
            Guard.Against.Null(user, nameof(user));

            try
            {
                await _retryPolicy.ExecuteAsync(async () =>
                {
                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();
                    return user;
                });

                // Log creation for audit
                await LogUserAccess(user.Id, "Create");

                // Invalidate any existing cache entries
                await InvalidateUserCache(user.Id, user.Email);

                return user;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user: {Email}", user.Email);
                throw;
            }
        }

        /// <summary>
        /// Updates an existing user with optimistic concurrency and security measures.
        /// </summary>
        /// <param name="user">The user entity to update</param>
        public async Task UpdateAsync(User user)
        {
            Guard.Against.Null(user, nameof(user));

            try
            {
                await _retryPolicy.ExecuteAsync(async () =>
                {
                    _context.Users.Update(user);
                    await _context.SaveChangesAsync();
                    return user;
                });

                // Log update for audit
                await LogUserAccess(user.Id, "Update");

                // Invalidate cache entries
                await InvalidateUserCache(user.Id, user.Email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user ID: {UserId}", user.Id);
                throw;
            }
        }

        private async Task LogUserAccess(int userId, string action)
        {
            var auditLog = new AuditLog(
                entityName: "User",
                entityId: userId.ToString(),
                action: action,
                changes: JsonSerializer.Serialize(new { UserId = userId, Action = action }),
                ipAddress: "::1", // Replace with actual IP in production
                userId: userId
            );

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
        }

        private async Task InvalidateUserCache(int userId, string email)
        {
            var tasks = new List<Task>
            {
                _cache.RemoveAsync($"{CACHE_KEY_PREFIX}{userId}"),
                _cache.RemoveAsync($"{CACHE_KEY_PREFIX}email_{email.ToUpperInvariant()}")
            };

            await Task.WhenAll(tasks);
        }
    }
}