using System;
using System.Collections.Generic;

namespace ServiceProvider.Core.Domain.Users
{
    /// <summary>
    /// Represents a role entity in the system for role-based access control (RBAC).
    /// Provides comprehensive validation and audit tracking capabilities.
    /// </summary>
    public class Role
    {
        /// <summary>
        /// Gets the unique identifier for the role.
        /// </summary>
        public int Id { get; private set; }

        /// <summary>
        /// Gets the name of the role.
        /// </summary>
        public string Name { get; private set; }

        /// <summary>
        /// Gets the normalized (uppercase) name of the role for case-insensitive comparisons.
        /// </summary>
        public string NormalizedName { get; private set; }

        /// <summary>
        /// Gets or sets the description of the role's purpose and permissions.
        /// </summary>
        public string Description { get; private set; }

        /// <summary>
        /// Gets whether the role is currently active and available for assignment.
        /// </summary>
        public bool IsActive { get; private set; }

        /// <summary>
        /// Gets the UTC timestamp when the role was created.
        /// </summary>
        public DateTime CreatedAt { get; private set; }

        /// <summary>
        /// Gets the UTC timestamp when the role was last modified, if applicable.
        /// </summary>
        public DateTime? ModifiedAt { get; private set; }

        /// <summary>
        /// Gets the collection of user-role assignments for this role.
        /// </summary>
        public ICollection<UserRole> UserRoles { get; private set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="Role"/> class.
        /// </summary>
        /// <param name="name">The name of the role.</param>
        /// <param name="description">The description of the role's purpose and permissions.</param>
        /// <exception cref="ArgumentNullException">Thrown when name or description is null.</exception>
        /// <exception cref="ArgumentException">Thrown when name or description is empty or whitespace.</exception>
        public Role(string name, string description)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Role name cannot be null or whitespace.", nameof(name));

            if (string.IsNullOrWhiteSpace(description))
                throw new ArgumentException("Role description cannot be null or whitespace.", nameof(description));

            Name = name.Trim();
            NormalizedName = Name.ToUpperInvariant();
            Description = description.Trim();
            IsActive = true;
            CreatedAt = DateTime.UtcNow;
            ModifiedAt = null;
            UserRoles = new HashSet<UserRole>();
        }

        /// <summary>
        /// Updates the role's details with validation and audit tracking.
        /// </summary>
        /// <param name="description">The new description for the role.</param>
        /// <exception cref="ArgumentException">Thrown when description is null, empty or whitespace.</exception>
        public void UpdateDetails(string description)
        {
            if (string.IsNullOrWhiteSpace(description))
                throw new ArgumentException("Role description cannot be null or whitespace.", nameof(description));

            Description = description.Trim();
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Deactivates the role to prevent future assignments while maintaining existing assignments
        /// for historical reference.
        /// </summary>
        public void Deactivate()
        {
            if (!IsActive)
                return;

            IsActive = false;
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Activates the role to allow new assignments.
        /// </summary>
        public void Activate()
        {
            if (IsActive)
                return;

            IsActive = true;
            ModifiedAt = DateTime.UtcNow;
        }

        // Protected constructor for EF Core
        protected Role() { }
    }
}