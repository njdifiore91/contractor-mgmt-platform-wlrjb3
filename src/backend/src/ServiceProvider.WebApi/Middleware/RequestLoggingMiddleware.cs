using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.DataContracts;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Audit;

namespace ServiceProvider.WebApi.Middleware
{
    /// <summary>
    /// Middleware component that implements comprehensive HTTP request/response logging
    /// with enhanced security monitoring, telemetry tracking, and audit capabilities.
    /// </summary>
    public class RequestLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RequestLoggingMiddleware> _logger;
        private readonly IApplicationDbContext _dbContext;
        private readonly TelemetryClient _telemetryClient;
        private readonly int _maxBodySize = 32 * 1024; // 32KB max body size for logging
        private readonly HashSet<string> _sensitiveHeaders = new(StringComparer.OrdinalIgnoreCase)
        {
            "Authorization",
            "Cookie",
            "X-API-Key",
            "X-CSRF-Token"
        };

        public RequestLoggingMiddleware(
            RequestDelegate next,
            ILogger<RequestLoggingMiddleware> logger,
            IApplicationDbContext dbContext,
            TelemetryClient telemetryClient)
        {
            _next = next ?? throw new ArgumentNullException(nameof(next));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _telemetryClient = telemetryClient ?? throw new ArgumentNullException(nameof(telemetryClient));
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var stopwatch = Stopwatch.StartNew();
            var requestId = Guid.NewGuid().ToString();

            try
            {
                // Enable request body buffering for logging
                context.Request.EnableBuffering();

                // Extract client IP with proxy handling
                var clientIp = GetClientIpAddress(context);

                // Log request details
                await LogRequest(context, requestId, clientIp);

                // Start request telemetry
                var requestTelemetry = new RequestTelemetry
                {
                    Name = $"{context.Request.Method} {context.Request.Path}",
                    Timestamp = DateTime.UtcNow
                };
                requestTelemetry.Context.Operation.Id = requestId;
                _telemetryClient.TrackRequest(requestTelemetry);

                // Process the request
                await _next(context);

                stopwatch.Stop();

                // Log response details
                await LogResponse(context, stopwatch.Elapsed, requestId, clientIp);

                // Create audit log
                await CreateAuditLog(context, clientIp, stopwatch.Elapsed);
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                _logger.LogError(ex, "Error processing request: {RequestId}", requestId);
                _telemetryClient.TrackException(ex);
                throw;
            }
        }

        private async Task LogRequest(HttpContext context, string requestId, string clientIp)
        {
            var request = context.Request;
            var logBuilder = new StringBuilder();
            logBuilder.AppendLine($"Request {requestId} from {clientIp}");
            logBuilder.AppendLine($"{request.Method} {request.Path}{request.QueryString}");

            // Log headers excluding sensitive ones
            foreach (var header in request.Headers.Where(h => !_sensitiveHeaders.Contains(h.Key)))
            {
                logBuilder.AppendLine($"{header.Key}: {header.Value}");
            }

            // Log request body if present and within size limit
            if (request.ContentLength.HasValue && request.ContentLength.Value <= _maxBodySize)
            {
                var body = await ReadRequestBody(request);
                if (!string.IsNullOrEmpty(body))
                {
                    logBuilder.AppendLine("Request Body:");
                    logBuilder.AppendLine(SanitizeContent(body));
                }
            }

            _logger.LogInformation(logBuilder.ToString());
        }

        private async Task LogResponse(HttpContext context, TimeSpan duration, string requestId, string clientIp)
        {
            var response = context.Response;
            var logBuilder = new StringBuilder();
            logBuilder.AppendLine($"Response for {requestId} from {clientIp}");
            logBuilder.AppendLine($"Status: {response.StatusCode}, Duration: {duration.TotalMilliseconds:F2}ms");

            // Log response headers excluding sensitive ones
            foreach (var header in response.Headers.Where(h => !_sensitiveHeaders.Contains(h.Key)))
            {
                logBuilder.AppendLine($"{header.Key}: {header.Value}");
            }

            // Track response metrics
            _telemetryClient.TrackMetric("RequestDuration", duration.TotalMilliseconds);
            _telemetryClient.TrackMetric("ResponseStatus", response.StatusCode);

            _logger.LogInformation(logBuilder.ToString());
        }

        private async Task CreateAuditLog(HttpContext context, string clientIp, TimeSpan duration)
        {
            var auditLog = new AuditLog(
                entityName: "HttpRequest",
                entityId: context.TraceIdentifier,
                action: context.Request.Method,
                changes: JsonSerializer.Serialize(new
                {
                    Path = context.Request.Path.Value,
                    StatusCode = context.Response.StatusCode,
                    Duration = duration.TotalMilliseconds
                }),
                ipAddress: clientIp,
                userId: GetCurrentUserId(context)
            );

            _dbContext.AuditLogs.Add(auditLog);
            await _dbContext.SaveChangesAsync();
        }

        private static async Task<string> ReadRequestBody(HttpRequest request)
        {
            try
            {
                request.Body.Position = 0;
                using var reader = new StreamReader(request.Body, Encoding.UTF8, true, 4096, true);
                var body = await reader.ReadToEndAsync();
                request.Body.Position = 0;
                return body;
            }
            catch (Exception)
            {
                return "[Error reading request body]";
            }
        }

        private static string GetClientIpAddress(HttpContext context)
        {
            var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrEmpty(forwardedFor))
            {
                return forwardedFor.Split(',')[0].Trim();
            }

            return context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
        }

        private static int? GetCurrentUserId(HttpContext context)
        {
            var userIdClaim = context.User?.Claims.FirstOrDefault(c => c.Type == "sub");
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }
            return null;
        }

        private static string SanitizeContent(string content)
        {
            // Basic sanitization - replace potential sensitive data patterns
            var sanitized = content;
            sanitized = System.Text.RegularExpressions.Regex.Replace(sanitized, @"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", "[EMAIL]");
            sanitized = System.Text.RegularExpressions.Regex.Replace(sanitized, @"\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b", "[CARD]");
            sanitized = System.Text.RegularExpressions.Regex.Replace(sanitized, @"\b\d{3}-\d{2}-\d{4}\b", "[SSN]");
            return sanitized;
        }
    }
}