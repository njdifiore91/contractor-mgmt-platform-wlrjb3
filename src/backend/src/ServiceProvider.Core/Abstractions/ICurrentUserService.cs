using System.Collections.Generic;
using System.Security.Claims;
using ServiceProvider.Core.Domain.Users;

namespace ServiceProvider.Core.Abstractions
{
    /// <summary>
    /// Defines the interface for accessing current authenticated user information throughout the application.
    /// Provides standardized access to user identity, roles, and authentication status in a security context.
    /// Integrates with Azure AD B2C authentication for enterprise identity management.
    /// </summary>
    public interface ICurrentUserService
    {
        /// <summary>
        /// Gets the unique identifier of the currently authenticated user.
        /// Returns null if no user is authenticated.
        /// </summary>
        int? UserId { get; }

        /// <summary>
        /// Gets the email address of the currently authenticated user.
        /// Returns null if no user is authenticated.
        /// </summary>
        string Email { get; }

        /// <summary>
        /// Gets the collection of role names assigned to the current user.
        /// Returns empty collection if no user is authenticated or user has no roles.
        /// </summary>
        IEnumerable<string> Roles { get; }

        /// <summary>
        /// Gets a value indicating whether the current user is authenticated.
        /// </summary>
        bool IsAuthenticated { get; }

        /// <summary>
        /// Gets the ClaimsPrincipal representing the current user's security context.
        /// Contains claims from Azure AD B2C token including roles and permissions.
        /// </summary>
        ClaimsPrincipal Principal { get; }

        /// <summary>
        /// Checks if the current user has the specified role using case-insensitive comparison.
        /// </summary>
        /// <param name="role">The role name to check. Must not be null or empty.</param>
        /// <returns>
        /// True if the user is authenticated and has the specified role;
        /// false if the role parameter is null/empty, user is not authenticated, or user lacks the role.
        /// </returns>
        bool IsInRole(string role);
    }
}