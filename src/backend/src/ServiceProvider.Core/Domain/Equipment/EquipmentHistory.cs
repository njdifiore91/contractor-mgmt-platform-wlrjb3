using System;
using ServiceProvider.Core.Domain.Equipment;

namespace ServiceProvider.Core.Domain.Equipment
{
    /// <summary>
    /// Provides comprehensive temporal tracking of equipment lifecycle events including status changes,
    /// assignments, maintenance records, condition updates, and audit trail capabilities.
    /// </summary>
    public class EquipmentHistory
    {
        #region Constants

        public static class EventTypes
        {
            public const string Created = "Created";
            public const string Assigned = "Assigned";
            public const string Returned = "Returned";
            public const string ConditionUpdate = "ConditionUpdate";
            public const string Maintenance = "Maintenance";
            public const string Archived = "Archived";
        }

        public static class ValidationStatuses
        {
            public const string Pending = "Pending";
            public const string Valid = "Valid";
            public const string Invalid = "Invalid";
        }

        #endregion

        #region Properties

        /// <summary>
        /// Unique identifier for the history record
        /// </summary>
        public int Id { get; private set; }

        /// <summary>
        /// Reference to the associated equipment item
        /// </summary>
        public int EquipmentId { get; private set; }

        /// <summary>
        /// Navigation property to the associated equipment
        /// </summary>
        public Equipment Equipment { get; private set; }

        /// <summary>
        /// Timestamp of when the event occurred (UTC)
        /// </summary>
        public DateTime EventDate { get; private set; }

        /// <summary>
        /// Type of event that occurred (see EventTypes constants)
        /// </summary>
        public string EventType { get; private set; }

        /// <summary>
        /// Previous state or value before the change
        /// </summary>
        public string PreviousValue { get; private set; }

        /// <summary>
        /// New state or value after the change
        /// </summary>
        public string NewValue { get; private set; }

        /// <summary>
        /// Additional notes or comments about the event
        /// </summary>
        public string Notes { get; private set; }

        /// <summary>
        /// User who initiated the change
        /// </summary>
        public string ChangedBy { get; private set; }

        /// <summary>
        /// Role of the user who made the change
        /// </summary>
        public string UserRole { get; private set; }

        /// <summary>
        /// Version of the system when the change was made
        /// </summary>
        public string SystemVersion { get; private set; }

        /// <summary>
        /// Current validation status of the history record
        /// </summary>
        public string ValidationStatus { get; private set; }

        /// <summary>
        /// Indicates if the record has been archived
        /// </summary>
        public bool IsArchived { get; private set; }

        /// <summary>
        /// Date when the record was archived (UTC)
        /// </summary>
        public DateTime? ArchiveDate { get; private set; }

        #endregion

        #region Constructor

        /// <summary>
        /// Creates a new equipment history record with comprehensive validation and data integrity checks
        /// </summary>
        /// <param name="equipmentId">ID of the associated equipment</param>
        /// <param name="eventType">Type of event being recorded</param>
        /// <param name="previousValue">Previous state or value</param>
        /// <param name="newValue">New state or value</param>
        /// <param name="changedBy">User making the change</param>
        /// <param name="userRole">Role of the user making the change</param>
        /// <exception cref="ArgumentException">Thrown when required parameters are invalid</exception>
        public EquipmentHistory(
            int equipmentId,
            string eventType,
            string previousValue,
            string newValue,
            string changedBy,
            string userRole)
        {
            if (equipmentId <= 0)
                throw new ArgumentException("Equipment ID must be greater than zero", nameof(equipmentId));

            if (string.IsNullOrWhiteSpace(eventType))
                throw new ArgumentException("Event type must be specified", nameof(eventType));

            if (!IsValidEventType(eventType))
                throw new ArgumentException("Invalid event type specified", nameof(eventType));

            if (string.IsNullOrWhiteSpace(changedBy))
                throw new ArgumentException("Changed by user must be specified", nameof(changedBy));

            if (string.IsNullOrWhiteSpace(userRole))
                throw new ArgumentException("User role must be specified", nameof(userRole));

            EquipmentId = equipmentId;
            EventType = eventType;
            PreviousValue = previousValue ?? "N/A";
            NewValue = newValue ?? "N/A";
            ChangedBy = changedBy;
            UserRole = userRole;
            EventDate = DateTime.UtcNow;
            ValidationStatus = ValidationStatuses.Pending;
            SystemVersion = GetCurrentSystemVersion();
            IsArchived = false;
            Notes = string.Empty;
        }

        #endregion

        #region Public Methods

        /// <summary>
        /// Adds additional notes to the history record with validation
        /// </summary>
        /// <param name="notes">Notes to be added</param>
        /// <exception cref="ArgumentException">Thrown when notes are null or empty</exception>
        /// <exception cref="InvalidOperationException">Thrown when record is archived</exception>
        public void AddNotes(string notes)
        {
            if (IsArchived)
                throw new InvalidOperationException("Cannot modify archived history records");

            if (string.IsNullOrWhiteSpace(notes))
                throw new ArgumentException("Notes cannot be empty", nameof(notes));

            Notes = string.IsNullOrEmpty(Notes)
                ? notes
                : $"{Notes}\n{notes}";

            ValidationStatus = ValidationStatuses.Pending;
        }

        /// <summary>
        /// Archives the history record for retention purposes
        /// </summary>
        /// <exception cref="InvalidOperationException">Thrown when record is already archived</exception>
        public void Archive()
        {
            if (IsArchived)
                throw new InvalidOperationException("Record is already archived");

            IsArchived = true;
            ArchiveDate = DateTime.UtcNow;
            ValidationStatus = ValidationStatuses.Valid;
        }

        #endregion

        #region Private Methods

        private bool IsValidEventType(string eventType)
        {
            return eventType == EventTypes.Created ||
                   eventType == EventTypes.Assigned ||
                   eventType == EventTypes.Returned ||
                   eventType == EventTypes.ConditionUpdate ||
                   eventType == EventTypes.Maintenance ||
                   eventType == EventTypes.Archived;
        }

        private string GetCurrentSystemVersion()
        {
            // This would typically come from application configuration
            return "1.0.0";
        }

        #endregion
    }
}