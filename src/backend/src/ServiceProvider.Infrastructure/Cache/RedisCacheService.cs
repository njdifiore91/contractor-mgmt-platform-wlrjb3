using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using ServiceProvider.Common.Constants;
using StackExchange.Redis; // v2.6.111
using System.IO.Compression;
using System.Text;

namespace ServiceProvider.Infrastructure.Cache
{
    /// <summary>
    /// Implements high-performance Redis caching service with comprehensive monitoring and error handling
    /// </summary>
    public class RedisCacheService
    {
        private readonly IConnectionMultiplexer _connection;
        private readonly ILogger<RedisCacheService> _logger;
        private readonly JsonSerializerOptions _jsonOptions;
        private const int COMPRESSION_THRESHOLD = 1024 * 100; // 100KB
        private const int MAX_RETRY_ATTEMPTS = 3;
        private const int RETRY_DELAY_MS = 100;

        public RedisCacheService(IConnectionMultiplexer connection, ILogger<RedisCacheService> logger)
        {
            _connection = connection ?? throw new ArgumentNullException(nameof(connection));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                WriteIndented = false,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            };
        }

        /// <summary>
        /// Retrieves a cached item with performance tracking
        /// </summary>
        public async Task<T?> GetAsync<T>(string key)
        {
            try
            {
                var startTime = DateTime.UtcNow;
                if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));

                var db = _connection.GetDatabase();
                var value = await db.StringGetAsync(key);

                var elapsed = DateTime.UtcNow - startTime;
                _logger.LogDebug("Cache get operation for key {Key} took {ElapsedMs}ms", key, elapsed.TotalMilliseconds);

                if (!value.HasValue)
                {
                    _logger.LogDebug("Cache miss for key {Key}", key);
                    return default;
                }

                if (value.ToString().Length > COMPRESSION_THRESHOLD)
                {
                    value = await DecompressDataAsync(value);
                }

                return JsonSerializer.Deserialize<T>(value!, _jsonOptions);
            }
            catch (RedisConnectionException ex)
            {
                _logger.LogError(ex, "Redis connection error during get operation for key {Key}", key);
                throw;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Deserialization error for key {Key}", key);
                return default;
            }
        }

        /// <summary>
        /// Stores an item in cache with compression and monitoring
        /// </summary>
        public async Task<bool> SetAsync<T>(string key, T value, TimeSpan expiration)
        {
            try
            {
                if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));
                if (value == null) throw new ArgumentNullException(nameof(value));

                var startTime = DateTime.UtcNow;
                var serialized = JsonSerializer.Serialize(value, _jsonOptions);
                var db = _connection.GetDatabase();

                if (serialized.Length > COMPRESSION_THRESHOLD)
                {
                    var compressed = await CompressDataAsync(serialized);
                    await db.StringSetAsync(key, compressed, expiration);
                }
                else
                {
                    await db.StringSetAsync(key, serialized, expiration);
                }

                var elapsed = DateTime.UtcNow - startTime;
                _logger.LogDebug("Cache set operation for key {Key} took {ElapsedMs}ms", key, elapsed.TotalMilliseconds);

                return true;
            }
            catch (RedisConnectionException ex)
            {
                _logger.LogError(ex, "Redis connection error during set operation for key {Key}", key);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting cache value for key {Key}", key);
                return false;
            }
        }

        /// <summary>
        /// Removes an item from cache with invalidation tracking
        /// </summary>
        public async Task<bool> RemoveAsync(string key)
        {
            try
            {
                if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));

                var startTime = DateTime.UtcNow;
                var db = _connection.GetDatabase();
                var result = await db.KeyDeleteAsync(key);

                var elapsed = DateTime.UtcNow - startTime;
                _logger.LogDebug("Cache remove operation for key {Key} took {ElapsedMs}ms", key, elapsed.TotalMilliseconds);

                return result;
            }
            catch (RedisConnectionException ex)
            {
                _logger.LogError(ex, "Redis connection error during remove operation for key {Key}", key);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing cache value for key {Key}", key);
                return false;
            }
        }

        /// <summary>
        /// Atomic get-or-set operation with retry policy
        /// </summary>
        public async Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan expiration)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));
            if (factory == null) throw new ArgumentNullException(nameof(factory));

            var attempt = 0;
            while (attempt < MAX_RETRY_ATTEMPTS)
            {
                try
                {
                    var cached = await GetAsync<T>(key);
                    if (cached != null) return cached;

                    var value = await factory();
                    if (value != null)
                    {
                        await SetAsync(key, value, expiration);
                        return value;
                    }

                    return default!;
                }
                catch (RedisConnectionException) when (++attempt < MAX_RETRY_ATTEMPTS)
                {
                    _logger.LogWarning("Retry attempt {Attempt} for key {Key}", attempt, key);
                    await Task.Delay(RETRY_DELAY_MS * attempt);
                }
            }

            // If all retries failed, execute factory directly
            return await factory();
        }

        private async Task<string> CompressDataAsync(string data)
        {
            using var input = new MemoryStream(Encoding.UTF8.GetBytes(data));
            using var output = new MemoryStream();
            using (var gzip = new GZipStream(output, CompressionLevel.Optimal))
            {
                await input.CopyToAsync(gzip);
            }
            return Convert.ToBase64String(output.ToArray());
        }

        private async Task<string> DecompressDataAsync(string compressedData)
        {
            var compressed = Convert.FromBase64String(compressedData);
            using var input = new MemoryStream(compressed);
            using var output = new MemoryStream();
            using (var gzip = new GZipStream(input, CompressionMode.Decompress))
            {
                await gzip.CopyToAsync(output);
            }
            return Encoding.UTF8.GetString(output.ToArray());
        }
    }
}