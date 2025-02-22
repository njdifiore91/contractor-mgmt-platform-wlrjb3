using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace ServiceProvider.WebApi.Filters
{
    /// <summary>
    /// Global exception filter that provides centralized error handling, logging and standardized 
    /// error responses for all API endpoints while ensuring security best practices.
    /// </summary>
    public class ApiExceptionFilter : IExceptionFilter
    {
        private readonly ILogger<ApiExceptionFilter> _logger;
        private const string _correlationIdHeaderName = "X-Correlation-ID";

        public ApiExceptionFilter(ILogger<ApiExceptionFilter> logger)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Handles exceptions during API request processing with secure logging and response formatting.
        /// </summary>
        /// <param name="context">The exception context containing error details.</param>
        public void OnException(ExceptionContext context)
        {
            if (context == null)
            {
                throw new ArgumentNullException(nameof(context));
            }

            // Generate correlation ID for request tracking
            string correlationId = Guid.NewGuid().ToString();

            // Log exception with correlation ID and sanitized details
            LogException(context.Exception, correlationId);

            // Determine appropriate HTTP status code
            var statusCode = DetermineStatusCode(context.Exception);

            // Create standardized error response
            var errorResponse = CreateErrorResponse(context.Exception, correlationId);

            // Set response details
            context.Result = new JsonResult(errorResponse)
            {
                StatusCode = (int)statusCode,
                ContentType = "application/json"
            };

            // Add correlation ID to response headers
            context.HttpContext.Response.Headers.Add(_correlationIdHeaderName, correlationId);

            // Mark exception as handled
            context.ExceptionHandled = true;
        }

        /// <summary>
        /// Maps exception types to appropriate HTTP status codes.
        /// </summary>
        private static HttpStatusCode DetermineStatusCode(Exception exception)
        {
            return exception switch
            {
                UnauthorizedAccessException => HttpStatusCode.Unauthorized,
                ArgumentException => HttpStatusCode.BadRequest,
                InvalidOperationException => HttpStatusCode.BadRequest,
                KeyNotFoundException => HttpStatusCode.NotFound,
                NotImplementedException => HttpStatusCode.NotImplemented,
                // Add additional exception mappings as needed
                _ => HttpStatusCode.InternalServerError
            };
        }

        /// <summary>
        /// Creates a standardized error response object with secure error details.
        /// </summary>
        private ErrorResponse CreateErrorResponse(Exception exception, string correlationId)
        {
            var errorCode = DetermineErrorCode(exception);
            var userMessage = GetUserFriendlyMessage(exception, errorCode);

            return new ErrorResponse
            {
                CorrelationId = correlationId,
                ErrorCode = errorCode,
                Message = userMessage,
                Timestamp = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Maps exception types to standardized error codes.
        /// </summary>
        private static string DetermineErrorCode(Exception exception)
        {
            return exception switch
            {
                UnauthorizedAccessException => "AUTH_ERROR",
                ArgumentException => "INVALID_INPUT",
                InvalidOperationException => "INVALID_OPERATION",
                KeyNotFoundException => "RESOURCE_NOT_FOUND",
                NotImplementedException => "NOT_IMPLEMENTED",
                // Add additional error code mappings as needed
                _ => "INTERNAL_ERROR"
            };
        }

        /// <summary>
        /// Provides user-friendly error messages based on exception type and error code.
        /// </summary>
        private static string GetUserFriendlyMessage(Exception exception, string errorCode)
        {
            return errorCode switch
            {
                "AUTH_ERROR" => "Authentication or authorization error occurred.",
                "INVALID_INPUT" => "The provided input was invalid.",
                "INVALID_OPERATION" => "The requested operation is invalid.",
                "RESOURCE_NOT_FOUND" => "The requested resource was not found.",
                "NOT_IMPLEMENTED" => "This functionality is not yet implemented.",
                "INTERNAL_ERROR" => "An unexpected error occurred. Please try again later.",
                _ => "An error occurred processing your request."
            };
        }

        /// <summary>
        /// Logs exception details securely with correlation ID and appropriate log level.
        /// </summary>
        private void LogException(Exception exception, string correlationId)
        {
            var logMessage = new
            {
                CorrelationId = correlationId,
                ExceptionType = exception.GetType().Name,
                ExceptionMessage = exception.Message,
                StackTrace = exception.StackTrace,
                Timestamp = DateTime.UtcNow
            };

            _logger.LogError(
                "Error processing request. CorrelationId: {CorrelationId}. Exception: {ExceptionDetails}",
                correlationId,
                JsonSerializer.Serialize(logMessage)
            );
        }
    }

    /// <summary>
    /// Standardized error response structure for API errors.
    /// </summary>
    public class ErrorResponse
    {
        public string CorrelationId { get; set; }
        public string ErrorCode { get; set; }
        public string Message { get; set; }
        public DateTime Timestamp { get; set; }
    }
}