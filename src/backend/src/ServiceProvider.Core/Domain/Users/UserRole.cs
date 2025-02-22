using System;

namespace ServiceProvider.Core.Domain.Users
{
    /// <summary>
    /// Represents a join entity for implementing many-to-many relationship between users and roles
    /// in the role-based access control (RBAC) system. Provides temporal tracking of role assignments
    /// and revocations for audit purposes.
    /// </summary>
    public class UserRole
    {
        /// <summary>
        /// Gets or sets the unique identifier for the user-role assignment.
        /// </summary>
        public int Id { get; private set; }

        /// <summary>
        /// Gets the identifier of the user to whom the role is assigned.
        /// </summary>
        public int UserId { get; private set; }

        /// <summary>
        /// Gets the identifier of the role that is assigned to the user.
        /// </summary>
        public int RoleId { get; private set; }

        /// <summary>
        /// Gets the UTC timestamp when the role was assigned to the user.
        /// </summary>
        public DateTime AssignedAt { get; private set; }

        /// <summary>
        /// Gets the UTC timestamp when the role was revoked from the user, if applicable.
        /// Null indicates an active role assignment.
        /// </summary>
        public DateTime? RevokedAt { get; private set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="UserRole"/> class.
        /// </summary>
        /// <param name="userId">The identifier of the user to whom the role will be assigned.</param>
        /// <param name="roleId">The identifier of the role to be assigned.</param>
        /// <exception cref="ArgumentException">Thrown when userId or roleId is less than or equal to 0.</exception>
        public UserRole(int userId, int roleId)
        {
            if (userId <= 0)
                throw new ArgumentException("User ID must be greater than 0.", nameof(userId));

            if (roleId <= 0)
                throw new ArgumentException("Role ID must be greater than 0.", nameof(roleId));

            UserId = userId;
            RoleId = roleId;
            AssignedAt = DateTime.UtcNow;
            RevokedAt = null;
        }

        /// <summary>
        /// Revokes the role assignment by setting the revocation timestamp.
        /// </summary>
        /// <exception cref="InvalidOperationException">Thrown when attempting to revoke an already revoked role.</exception>
        public void RevokeRole()
        {
            if (RevokedAt.HasValue)
                throw new InvalidOperationException("Role assignment has already been revoked.");

            var revocationTime = DateTime.UtcNow;
            if (revocationTime <= AssignedAt)
                throw new InvalidOperationException("Revocation time must be after assignment time.");

            RevokedAt = revocationTime;
        }

        /// <summary>
        /// Determines whether the role assignment is currently active.
        /// </summary>
        /// <returns>True if the role is currently assigned and not revoked; otherwise, false.</returns>
        public bool IsActive()
        {
            return !RevokedAt.HasValue && AssignedAt <= DateTime.UtcNow;
        }

        // Protected constructor for EF Core
        protected UserRole() { }
    }
}