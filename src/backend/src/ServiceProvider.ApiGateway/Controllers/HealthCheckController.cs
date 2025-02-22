using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ServiceProvider.ApiGateway.Controllers
{
    /// <summary>
    /// Enhanced controller providing detailed health check endpoints with comprehensive monitoring capabilities
    /// </summary>
    [ApiController]
    [Route("[controller]")]
    [ApiVersion("1.0")]
    public class HealthCheckController : ControllerBase
    {
        private readonly ILogger<HealthCheckController> _logger;
        private readonly HealthCheckService _healthCheckService;
        private readonly IConfiguration _configuration;
        private readonly IMetricsCollector _metricsCollector;
        private readonly double _cpuThreshold;
        private readonly double _memoryThreshold;
        private readonly int _maxResponseTime;

        /// <summary>
        /// Initializes controller with required dependencies for health monitoring
        /// </summary>
        public HealthCheckController(
            ILogger<HealthCheckController> logger,
            HealthCheckService healthCheckService,
            IConfiguration configuration,
            IMetricsCollector metricsCollector)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _healthCheckService = healthCheckService ?? throw new ArgumentNullException(nameof(healthCheckService));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _metricsCollector = metricsCollector ?? throw new ArgumentNullException(nameof(metricsCollector));

            // Initialize thresholds from configuration
            _cpuThreshold = _configuration.GetValue<double>("HealthCheck:CpuThreshold", 80);
            _memoryThreshold = _configuration.GetValue<double>("HealthCheck:MemoryThreshold", 85);
            _maxResponseTime = _configuration.GetValue<int>("HealthCheck:MaxResponseTime", 2000);
        }

        /// <summary>
        /// Returns comprehensive health status of the API Gateway and its dependencies with detailed metrics
        /// </summary>
        /// <returns>Detailed health status with metrics</returns>
        [HttpGet("/health")]
        [ProducesResponseType(typeof(HealthCheckResponse), 200)]
        [ProducesResponseType(typeof(ErrorResponse), 503)]
        [ResponseCache(Duration = 30)]
        public async Task<IActionResult> GetHealth()
        {
            var correlationId = Guid.NewGuid().ToString();
            
            try
            {
                _logger.LogInformation("Starting health check. CorrelationId: {CorrelationId}", correlationId);

                var healthReport = await _healthCheckService.CheckHealthAsync();
                var metrics = await _metricsCollector.GetCurrentMetricsAsync();

                var healthCheckResponse = new HealthCheckResponse
                {
                    Status = healthReport.Status.ToString(),
                    CorrelationId = correlationId,
                    Timestamp = DateTime.UtcNow,
                    Components = healthReport.Entries.ToDictionary(
                        entry => entry.Key,
                        entry => new ComponentHealth
                        {
                            Status = entry.Value.Status.ToString(),
                            Description = entry.Value.Description,
                            Duration = entry.Value.Duration
                        }
                    ),
                    Metrics = new PerformanceMetrics
                    {
                        CpuUsage = metrics.CpuUsage,
                        MemoryUsage = metrics.MemoryUsage,
                        RequestsPerSecond = metrics.RequestRate,
                        AverageResponseTime = metrics.AverageResponseTime
                    }
                };

                var isHealthy = healthReport.Status == HealthStatus.Healthy 
                    && metrics.CpuUsage < _cpuThreshold 
                    && metrics.MemoryUsage < _memoryThreshold 
                    && metrics.AverageResponseTime < _maxResponseTime;

                _logger.LogInformation(
                    "Health check completed. CorrelationId: {CorrelationId}, Status: {Status}, CPU: {Cpu}%, Memory: {Memory}%",
                    correlationId,
                    healthCheckResponse.Status,
                    metrics.CpuUsage,
                    metrics.MemoryUsage);

                if (isHealthy)
                {
                    return Ok(healthCheckResponse);
                }

                return StatusCode(503, new ErrorResponse
                {
                    CorrelationId = correlationId,
                    Message = "System health check failed",
                    Details = healthCheckResponse
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during health check. CorrelationId: {CorrelationId}", correlationId);
                return StatusCode(503, new ErrorResponse
                {
                    CorrelationId = correlationId,
                    Message = "Error performing health check",
                    Error = ex.Message
                });
            }
        }

        /// <summary>
        /// Performs comprehensive readiness check of API Gateway and all dependencies with circuit breaker pattern
        /// </summary>
        /// <returns>Detailed readiness status of all components</returns>
        [HttpGet("/ready")]
        [ProducesResponseType(typeof(ReadinessResponse), 200)]
        [ProducesResponseType(typeof(ErrorResponse), 503)]
        [ResponseCache(Duration = 15)]
        public async Task<IActionResult> GetReadiness()
        {
            var correlationId = Guid.NewGuid().ToString();

            try
            {
                _logger.LogInformation("Starting readiness check. CorrelationId: {CorrelationId}", correlationId);

                var readinessChecks = new List<ComponentReadiness>();
                var startTime = DateTime.UtcNow;

                // Check Redis cache
                var redisCheck = await CheckComponentReadinessAsync("Redis", 
                    async () => await _healthCheckService.CheckHealthAsync("redis"));
                readinessChecks.Add(redisCheck);

                // Check database
                var dbCheck = await CheckComponentReadinessAsync("Database", 
                    async () => await _healthCheckService.CheckHealthAsync("sqlserver"));
                readinessChecks.Add(dbCheck);

                // Check message queue
                var mqCheck = await CheckComponentReadinessAsync("MessageQueue", 
                    async () => await _healthCheckService.CheckHealthAsync("messagequeue"));
                readinessChecks.Add(mqCheck);

                var readinessResponse = new ReadinessResponse
                {
                    CorrelationId = correlationId,
                    Timestamp = DateTime.UtcNow,
                    Duration = DateTime.UtcNow - startTime,
                    Components = readinessChecks
                };

                var isReady = readinessChecks.All(c => c.Status == HealthStatus.Healthy.ToString());

                _logger.LogInformation(
                    "Readiness check completed. CorrelationId: {CorrelationId}, Status: {Status}, Duration: {Duration}ms",
                    correlationId,
                    isReady ? "Ready" : "Not Ready",
                    readinessResponse.Duration.TotalMilliseconds);

                if (isReady)
                {
                    return Ok(readinessResponse);
                }

                return StatusCode(503, new ErrorResponse
                {
                    CorrelationId = correlationId,
                    Message = "System is not ready",
                    Details = readinessResponse
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during readiness check. CorrelationId: {CorrelationId}", correlationId);
                return StatusCode(503, new ErrorResponse
                {
                    CorrelationId = correlationId,
                    Message = "Error performing readiness check",
                    Error = ex.Message
                });
            }
        }

        private async Task<ComponentReadiness> CheckComponentReadinessAsync(
            string component, 
            Func<Task<HealthReport>> checkFunc)
        {
            try
            {
                var startTime = DateTime.UtcNow;
                var result = await checkFunc();
                var duration = DateTime.UtcNow - startTime;

                return new ComponentReadiness
                {
                    Name = component,
                    Status = result.Status.ToString(),
                    ResponseTime = duration,
                    LastChecked = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Component check failed for {Component}", component);
                return new ComponentReadiness
                {
                    Name = component,
                    Status = HealthStatus.Unhealthy.ToString(),
                    Error = ex.Message,
                    LastChecked = DateTime.UtcNow
                };
            }
        }
    }

    public class HealthCheckResponse
    {
        public string Status { get; set; }
        public string CorrelationId { get; set; }
        public DateTime Timestamp { get; set; }
        public Dictionary<string, ComponentHealth> Components { get; set; }
        public PerformanceMetrics Metrics { get; set; }
    }

    public class ComponentHealth
    {
        public string Status { get; set; }
        public string Description { get; set; }
        public TimeSpan Duration { get; set; }
    }

    public class PerformanceMetrics
    {
        public double CpuUsage { get; set; }
        public double MemoryUsage { get; set; }
        public double RequestsPerSecond { get; set; }
        public double AverageResponseTime { get; set; }
    }

    public class ReadinessResponse
    {
        public string CorrelationId { get; set; }
        public DateTime Timestamp { get; set; }
        public TimeSpan Duration { get; set; }
        public List<ComponentReadiness> Components { get; set; }
    }

    public class ComponentReadiness
    {
        public string Name { get; set; }
        public string Status { get; set; }
        public TimeSpan? ResponseTime { get; set; }
        public string Error { get; set; }
        public DateTime LastChecked { get; set; }
    }

    public class ErrorResponse
    {
        public string CorrelationId { get; set; }
        public string Message { get; set; }
        public string Error { get; set; }
        public object Details { get; set; }
    }
}