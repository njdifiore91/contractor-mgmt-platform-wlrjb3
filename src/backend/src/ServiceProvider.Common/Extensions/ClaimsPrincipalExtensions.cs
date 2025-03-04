using System;
using System.Linq;
using System.Security.Claims;
using ServiceProvider.Common.Constants;

namespace ServiceProvider.Common.Extensions
{
    /// <summary>
    /// Provides extension methods for ClaimsPrincipal to simplify access to common claims
    /// in the context of Azure AD B2C authentication. Implements secure claim access patterns
    /// with comprehensive null checking and validation.
    /// </summary>
    public static class ClaimsPrincipalExtensions
    {
        /// <summary>
        /// Retrieves the user ID from claims with null validation.
        /// </summary>
        /// <param name="principal">The ClaimsPrincipal containing user claims.</param>
        /// <returns>The user ID from claims or null if not found.</returns>
        /// <exception cref="ArgumentNullException">Thrown when principal is null.</exception>
        public static int GetUserId(this ClaimsPrincipal principal)
        {
            if (principal == null)
            {
                throw new ArgumentNullException(nameof(principal), "ClaimsPrincipal cannot be null when accessing user ID.");
            }

            return int.TryParse(principal.Claims
                .SingleOrDefault(c => c.Type == AuthorizationConstants.JwtClaimTypes_UserId)
                ?.Value, out var userId) ? userId : 0;
        }

        /// <summary>
        /// Retrieves the user email from claims with validation.
        /// </summary>
        /// <param name="principal">The ClaimsPrincipal containing user claims.</param>
        /// <returns>The user email from claims or null if not found.</returns>
        /// <exception cref="ArgumentNullException">Thrown when principal is null.</exception>
        public static string GetUserEmail(this ClaimsPrincipal principal)
        {
            if (principal == null)
            {
                throw new ArgumentNullException(nameof(principal), "ClaimsPrincipal cannot be null when accessing user email.");
            }

            return principal.Claims
                .SingleOrDefault(c => c.Type == AuthorizationConstants.JwtClaimTypes_Email)
                ?.Value;
        }

        /// <summary>
        /// Retrieves the user's full name from claims with validation.
        /// </summary>
        /// <param name="principal">The ClaimsPrincipal containing user claims.</param>
        /// <returns>The user's full name from claims or null if not found.</returns>
        /// <exception cref="ArgumentNullException">Thrown when principal is null.</exception>
        public static string GetUserName(this ClaimsPrincipal principal)
        {
            if (principal == null)
            {
                throw new ArgumentNullException(nameof(principal), "ClaimsPrincipal cannot be null when accessing user name.");
            }

            return principal.Claims
                .SingleOrDefault(c => c.Type == AuthorizationConstants.JwtClaimTypes_Name)
                ?.Value;
        }

        /// <summary>
        /// Retrieves all roles assigned to the user with optimized collection handling.
        /// </summary>
        /// <param name="principal">The ClaimsPrincipal containing user claims.</param>
        /// <returns>Collection of role names assigned to the user, never null.</returns>
        /// <exception cref="ArgumentNullException">Thrown when principal is null.</exception>
        public static IEnumerable<string> GetUserRoles(this ClaimsPrincipal principal)
        {
            if (principal == null)
            {
                throw new ArgumentNullException(nameof(principal), "ClaimsPrincipal cannot be null when accessing user roles.");
            }

            return principal.Claims
                .Where(c => c.Type == AuthorizationConstants.JwtClaimTypes_Role)
                .Select(c => c.Value)
                .ToList();
        }
    }
}
