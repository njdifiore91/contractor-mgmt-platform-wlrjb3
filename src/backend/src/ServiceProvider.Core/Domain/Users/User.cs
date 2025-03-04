using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Text.Json;
using System.Linq;

namespace ServiceProvider.Core.Domain.Users
{
    /// <summary>
    /// Represents a user entity in the service provider management system.
    /// Implements core user identity, authentication, and role-based access control functionality.
    /// </summary>
    public class User
    {
        // RFC 5322 compliant email regex pattern
        private static readonly Regex EmailPattern = new(
            @"^(?>[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|""(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*"")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$",
            RegexOptions.Compiled | RegexOptions.CultureInvariant);

        private static readonly Regex NamePattern = new(@"^[a-zA-Z\s-']{2,50}$", RegexOptions.Compiled);
        private static readonly Regex PhonePattern = new(@"^\+[1-9]\d{1,14}$", RegexOptions.Compiled);
        private static readonly Regex GuidPattern = new(@"^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$", RegexOptions.Compiled);

        public int Id { get; private set; }
        public string Email { get; private set; }
        public string Password { get; set; }
        public string NormalizedEmail { get; private set; }
        public string FirstName { get; private set; }
        public string LastName { get; private set; }
        public string PhoneNumber { get; private set; }
        public bool IsActive { get; private set; }
        public string AzureAdB2CId { get; private set; }
        public ICollection<UserRole> UserRoles { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime? ModifiedAt { get; private set; }
        public DateTime? LastLoginAt { get; private set; }
        public int LoginAttempts { get; private set; }
        public bool IsLocked { get; private set; }
        public DateTime? LockoutEnd { get; private set; }
        public string PreferredLanguage { get; private set; }
        public bool IsMfaEnabled { get; private set; }
        public string AuditTrail { get; private set; }

        /// <summary>
        /// Initializes a new instance of the User class with required validation.
        /// </summary>
        /// <param name="email">The user's email address (RFC 5322 compliant)</param>
        /// <param name="firstName">The user's first name (2-50 characters, letters only)</param>
        /// <param name="lastName">The user's last name (2-50 characters, letters only)</param>
        /// <param name="azureAdB2CId">The Azure AD B2C unique identifier</param>
        /// <exception cref="ArgumentException">Thrown when input validation fails</exception>
        public User(string email, string firstName, string lastName, string azureAdB2CId)
        {
            if (string.IsNullOrWhiteSpace(email))
                throw new ArgumentException("Email cannot be empty.", nameof(email));
            if (!EmailPattern.IsMatch(email))
                throw new ArgumentException("Invalid email format.", nameof(email));

            if (string.IsNullOrWhiteSpace(firstName))
                throw new ArgumentException("First name cannot be empty.", nameof(firstName));
            if (!NamePattern.IsMatch(firstName))
                throw new ArgumentException("Invalid first name format or length.", nameof(firstName));

            if (string.IsNullOrWhiteSpace(lastName))
                throw new ArgumentException("Last name cannot be empty.", nameof(lastName));

            if (!NamePattern.IsMatch(lastName))
                throw new ArgumentException("Invalid last name format or length.", nameof(lastName));

            if (string.IsNullOrWhiteSpace(azureAdB2CId))
                throw new ArgumentException("Azure AD B2C ID cannot be empty.", nameof(azureAdB2CId));

            if (!GuidPattern.IsMatch(azureAdB2CId))
                throw new ArgumentException("Invalid Azure AD B2C ID format.", nameof(azureAdB2CId));

            Email = email;
            NormalizedEmail = email.ToUpperInvariant();
            FirstName = firstName;
            LastName = lastName;
            AzureAdB2CId = azureAdB2CId;
            IsActive = true;
            UserRoles = new HashSet<UserRole>();
            CreatedAt = DateTime.UtcNow;
            LoginAttempts = 0;
            IsLocked = false;
            IsMfaEnabled = false;
            AuditTrail = JsonSerializer.Serialize(new List<AuditEntry>());
            PreferredLanguage = "en-US";
        }

        //only used for seeding data
        public User(int id, string email, string firstName, string lastName, string azureAdB2CId, string password, string phoneNumber) : this(email, firstName, lastName, azureAdB2CId)
        {
            if (string.IsNullOrWhiteSpace(password))
                throw new ArgumentException("Password cannot be empty.", nameof(password));

            Id = id;
            Password = password;
            PhoneNumber = phoneNumber;
        }

        /// <summary>
        /// Updates the user's profile information with validation.
        /// </summary>
        /// <param name="firstName">The new first name</param>
        /// <param name="lastName">The new last name</param>
        /// <param name="phoneNumber">The new phone number (E.164 format)</param>
        /// <exception cref="ArgumentException">Thrown when validation fails</exception>
        public void UpdateProfile(string firstName, string lastName, string phoneNumber)
        {
            if (!NamePattern.IsMatch(firstName))
                throw new ArgumentException("Invalid first name format or length.", nameof(firstName));
            if (!NamePattern.IsMatch(lastName))
                throw new ArgumentException("Invalid last name format or length.", nameof(lastName));
            if (!string.IsNullOrEmpty(phoneNumber) && !PhonePattern.IsMatch(phoneNumber))
                throw new ArgumentException("Invalid phone number format (E.164 required).", nameof(phoneNumber));

            FirstName = firstName;
            LastName = lastName;
            PhoneNumber = phoneNumber;
            ModifiedAt = DateTime.UtcNow;

            AddAuditEntry("ProfileUpdated", $"Profile updated: {firstName} {lastName}");
        }

        public void SetPassword(string password) => Password = password;

        /// <summary>
        /// Assigns a new role to the user.
        /// </summary>
        /// <param name="roleId">The ID of the role to assign</param>
        /// <returns>True if role was added, false if already exists</returns>
        /// <exception cref="ArgumentException">Thrown when roleId is invalid</exception>
        public bool AddRole(int roleId)
        {
            if (roleId <= 0)
                throw new ArgumentException("Role ID must be greater than 0.", nameof(roleId));

            if (UserRoles.Any(ur => ur.RoleId == roleId && ur.IsActive()))
                return false;

            var userRole = new UserRole(Id, roleId);
            UserRoles.Add(userRole);
            ModifiedAt = DateTime.UtcNow;

            AddAuditEntry("RoleAdded", $"Role {roleId} assigned");
            return true;
        }

        /// <summary>
        /// Removes a role from the user.
        /// </summary>
        /// <param name="roleId">The ID of the role to remove</param>
        /// <returns>True if role was removed, false if not found</returns>
        public bool RemoveRole(int roleId)
        {
            var userRole = UserRoles.FirstOrDefault(ur => ur.RoleId == roleId && ur.IsActive());
            if (userRole == null)
                return false;

            userRole.RevokeRole();
            ModifiedAt = DateTime.UtcNow;

            AddAuditEntry("RoleRemoved", $"Role {roleId} removed");
            return true;
        }

        /// <summary>
        /// Checks if user has a specific role.
        /// </summary>
        /// <param name="roleId">The role ID to check</param>
        /// <returns>True if user has the role, false otherwise</returns>
        public bool HasRole(int roleId)
        {
            return UserRoles.Any(ur => ur.RoleId == roleId && ur.IsActive());
        }

        private void AddAuditEntry(string action, string details)
        {
            var auditEntries = JsonSerializer.Deserialize<List<AuditEntry>>(AuditTrail);
            auditEntries.Add(new AuditEntry
            {
                Timestamp = DateTime.UtcNow,
                Action = action,
                Details = details
            });
            AuditTrail = JsonSerializer.Serialize(auditEntries);
        }

        // Protected constructor for EF Core
        protected User() { }

        private class AuditEntry
        {
            public DateTime Timestamp { get; set; }
            public string Action { get; set; }
            public string Details { get; set; }
        }
    }
}
