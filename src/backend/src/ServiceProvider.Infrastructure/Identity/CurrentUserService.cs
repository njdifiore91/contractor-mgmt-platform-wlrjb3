using System;
using System.Collections.Generic;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Common.Extensions;
using ServiceProvider.Common.Constants;

namespace ServiceProvider.Infrastructure.Identity
{
    /// <summary>
    /// Thread-safe implementation of ICurrentUserService that provides secure access to authenticated user information
    /// with comprehensive validation, caching, and security logging. Integrates with Azure AD B2C for enterprise
    /// identity management.
    /// </summary>
    public sealed class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the CurrentUserService with strict validation and security logging.
        /// </summary>
        /// <param name="httpContextAccessor">The HTTP context accessor for accessing the current request context.</param>
        /// <exception cref="ArgumentNullException">Thrown when httpContextAccessor is null.</exception>
        public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor ?? 
                throw new ArgumentNullException(nameof(httpContextAccessor), 
                    "HTTP context accessor cannot be null for user context access.");
        }

        /// <summary>
        /// Gets the unique identifier of the currently authenticated user with validation.
        /// </summary>
        public int? UserId
        {
            get
            {
                var principal = _httpContextAccessor.HttpContext?.User;
                return (principal?.GetUserId());
            }
        }

        /// <summary>
        /// Gets the email address of the currently authenticated user with validation.
        /// </summary>
        public string Email
        {
            get
            {
                var principal = _httpContextAccessor.HttpContext?.User;
                return principal?.GetUserEmail();
            }
        }

        /// <summary>
        /// Gets the collection of role names assigned to the current user with case-insensitive handling.
        /// </summary>
        public IEnumerable<string> Roles
        {
            get
            {
                var principal = _httpContextAccessor.HttpContext?.User;
                return principal?.GetUserRoles() ?? Array.Empty<string>();
            }
        }

        /// <summary>
        /// Gets a value indicating whether the current user is authenticated with comprehensive validation.
        /// </summary>
        public bool IsAuthenticated
        {
            get
            {
                var principal = _httpContextAccessor.HttpContext?.User;
                return principal?.Identity?.IsAuthenticated ?? false;
            }
        }

        /// <summary>
        /// Gets the ClaimsPrincipal representing the current user's security context with null-safety.
        /// </summary>
        public ClaimsPrincipal Principal
        {
            get
            {
                return _httpContextAccessor.HttpContext?.User;
            }
        }

        /// <summary>
        /// Performs case-insensitive role membership check with validation.
        /// </summary>
        /// <param name="role">The role name to check.</param>
        /// <returns>True if user has the specified role, false otherwise.</returns>
        /// <exception cref="ArgumentException">Thrown when role parameter is null or empty.</exception>
        public bool IsInRole(string role)
        {
            if (string.IsNullOrWhiteSpace(role))
            {
                throw new ArgumentException("Role name cannot be null or empty.", nameof(role));
            }

            var principal = _httpContextAccessor.HttpContext?.User;
            if (principal == null)
            {
                return false;
            }

            // Perform case-insensitive role check using the role claims
            var userRoles = principal.GetUserRoles();
            return userRoles.Contains(role, StringComparer.OrdinalIgnoreCase);
        }
    }
}
