// System v6.0.0 - Provides basic .NET types including string for constant definitions
using System;

namespace ServiceProvider.Common.Constants
{
    /// <summary>
    /// Defines constant values used for authorization throughout the application,
    /// including role names, policy names, claim types, and permission scopes.
    /// These constants support role-based access control (RBAC) implementation
    /// and integrate with Azure AD B2C authentication.
    /// </summary>
    public static class AuthorizationConstants
    {
        #region Role Definitions

        /// <summary>
        /// Administrator role with full system access
        /// </summary>
        public const string AdminRole = "Admin";

        /// <summary>
        /// Operations role with equipment and inspector management access
        /// </summary>
        public const string OperationsRole = "Operations";

        /// <summary>
        /// Inspector role with self-service access
        /// </summary>
        public const string InspectorRole = "Inspector";

        /// <summary>
        /// Customer service role with customer data access
        /// </summary>
        public const string CustomerServiceRole = "CustomerService";

        #endregion

        #region JWT Claim Types

        /// <summary>
        /// JWT claim type for user role identification
        /// </summary>
        public const string JwtClaimTypes_Role = "role";

        /// <summary>
        /// JWT claim type for user email
        /// </summary>
        public const string JwtClaimTypes_Email = "email";

        /// <summary>
        /// JWT claim type for user identifier (subject)
        /// </summary>
        public const string JwtClaimTypes_UserId = "sub";

        /// <summary>
        /// JWT claim type for user display name
        /// </summary>
        public const string JwtClaimTypes_Name = "name";

        #endregion

        #region Authorization Policies

        /// <summary>
        /// Policy requiring admin role for access
        /// </summary>
        public const string Policy_RequireAdmin = "RequireAdmin";

        /// <summary>
        /// Policy requiring operations role for access
        /// </summary>
        public const string Policy_RequireOperations = "RequireOperations";

        /// <summary>
        /// Policy requiring inspector role for access
        /// </summary>
        public const string Policy_RequireInspector = "RequireInspector";

        /// <summary>
        /// Policy requiring customer service role for access
        /// </summary>
        public const string Policy_RequireCustomerService = "RequireCustomerService";

        #endregion

        #region Permission Scopes

        /// <summary>
        /// Permission scope for complete resource access
        /// </summary>
        public const string Scope_FullAccess = "full_access";

        /// <summary>
        /// Permission scope for read-only access
        /// </summary>
        public const string Scope_ReadOnly = "read_only";

        /// <summary>
        /// Permission scope for accessing own resources only
        /// </summary>
        public const string Scope_SelfOnly = "self_only";

        #endregion
    }
}