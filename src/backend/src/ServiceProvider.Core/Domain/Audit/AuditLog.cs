using System;
using ServiceProvider.Core.Domain.Users;
using System.Text.RegularExpressions;
using System.Text.Json;

namespace ServiceProvider.Core.Domain.Audit
{
    /// <summary>
    /// Represents a comprehensive audit log entry that tracks system changes and data access
    /// for security monitoring and compliance with ISO 27001 and SOC 2 requirements.
    /// </summary>
    public class AuditLog
    {
        // Regular expressions for validation
        private static readonly Regex IpAddressPattern = new(
            @"^(?:(?:25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})\.){3}(?:25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})$|^(?:(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4})|(?:(?:[0-9a-fA-F]{1,4}:){6}:[0-9a-fA-F]{1,4})|(?:(?:[0-9a-fA-F]{1,4}:){5}:(?:[0-9a-fA-F]{1,4}:)?[0-9a-fA-F]{1,4})|(?:(?:[0-9a-fA-F]{1,4}:){4}:(?:[0-9a-fA-F]{1,4}:){0,2}[0-9a-fA-F]{1,4})|(?:(?:[0-9a-fA-F]{1,4}:){3}:(?:[0-9a-fA-F]{1,4}:){0,3}[0-9a-fA-F]{1,4})|(?:(?:[0-9a-fA-F]{1,4}:){2}:(?:[0-9a-fA-F]{1,4}:){0,4}[0-9a-fA-F]{1,4})|(?:(?:[0-9a-fA-F]{1,4}:){6}(?:(?:(?:25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2}))\.){3}(?:(?:25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})))|(?:(?:[0-9a-fA-F]{1,4}:){0,5}:(?:(?:(?:25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2}))\.){3}(?:(?:25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})))|(?:::(?:[0-9a-fA-F]{1,4}:){0,5}(?:(?:(?:25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2}))\.){3}(?:(?:25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})))|(?:[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4})|(?:::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4})|(?:(?:[0-9a-fA-F]{1,4}:){1,7}:))$",
            RegexOptions.Compiled | RegexOptions.CultureInvariant);

        private static readonly string[] ValidActions = { "Create", "Read", "Update", "Delete", "Login", "Logout", "Export", "Import", "Archive" };

        /// <summary>
        /// Gets the unique identifier for the audit log entry.
        /// </summary>
        public int Id { get; private set; }

        /// <summary>
        /// Gets the ID of the user who performed the action, if available.
        /// </summary>
        public int? UserId { get; private set; }

        /// <summary>
        /// Gets the user who performed the action, if available.
        /// </summary>
        public User User { get; private set; }

        /// <summary>
        /// Gets the name of the entity being audited.
        /// </summary>
        public string EntityName { get; private set; }

        /// <summary>
        /// Gets the identifier of the entity being audited.
        /// </summary>
        public string EntityId { get; private set; }

        /// <summary>
        /// Gets the type of action performed.
        /// </summary>
        public string Action { get; private set; }

        /// <summary>
        /// Gets the JSON-formatted changes made to the entity.
        /// </summary>
        public string Changes { get; private set; }

        /// <summary>
        /// Gets the IP address from which the action was performed.
        /// </summary>
        public string IpAddress { get; private set; }

        /// <summary>
        /// Gets the UTC timestamp when the action occurred.
        /// </summary>
        public DateTime Timestamp { get; private set; }

        /// <summary>
        /// Initializes a new instance of the AuditLog class with comprehensive validation.
        /// </summary>
        /// <param name="entityName">The name of the entity being audited</param>
        /// <param name="entityId">The identifier of the entity being audited</param>
        /// <param name="action">The type of action performed</param>
        /// <param name="changes">JSON-formatted string containing the changes made</param>
        /// <param name="ipAddress">The IP address from which the action was performed</param>
        /// <param name="userId">The ID of the user who performed the action (optional)</param>
        /// <exception cref="ArgumentException">Thrown when validation fails for any parameter</exception>
        /// <exception cref="ArgumentNullException">Thrown when required parameters are null</exception>
        public AuditLog(string entityName, string entityId, string action, string changes, string ipAddress, int? userId = null)
        {
            if (string.IsNullOrWhiteSpace(entityName))
                throw new ArgumentException("Entity name cannot be empty.", nameof(entityName));

            if (string.IsNullOrWhiteSpace(entityId))
                throw new ArgumentException("Entity ID cannot be empty.", nameof(entityId));

            if (string.IsNullOrWhiteSpace(action))
                throw new ArgumentException("Action cannot be empty.", nameof(action));

            if (!ValidActions.Contains(action))
                throw new ArgumentException($"Invalid action type. Valid actions are: {string.Join(", ", ValidActions)}", nameof(action));

            if (string.IsNullOrWhiteSpace(changes))
                throw new ArgumentException("Changes cannot be empty.", nameof(changes));

            // Validate changes is valid JSON
            try
            {
                JsonDocument.Parse(changes);
            }
            catch (JsonException)
            {
                throw new ArgumentException("Changes must be valid JSON.", nameof(changes));
            }

            if (string.IsNullOrWhiteSpace(ipAddress))
                throw new ArgumentException("IP address cannot be empty.", nameof(ipAddress));

            if (!IpAddressPattern.IsMatch(ipAddress))
                throw new ArgumentException("Invalid IP address format.", nameof(ipAddress));

            if (userId.HasValue && userId.Value <= 0)
                throw new ArgumentException("User ID must be greater than 0.", nameof(userId));

            EntityName = entityName;
            EntityId = entityId;
            Action = action;
            Changes = changes;
            IpAddress = ipAddress;
            UserId = userId;
            Timestamp = DateTime.UtcNow;

            ValidateTimestamp();
        }

        /// <summary>
        /// Validates that the timestamp is not in the future.
        /// </summary>
        /// <exception cref="InvalidOperationException">Thrown when timestamp is in the future</exception>
        private void ValidateTimestamp()
        {
            if (Timestamp > DateTime.UtcNow)
                throw new InvalidOperationException("Audit log timestamp cannot be in the future.");
        }

        // Protected constructor for EF Core
        protected AuditLog() { }
    }
}