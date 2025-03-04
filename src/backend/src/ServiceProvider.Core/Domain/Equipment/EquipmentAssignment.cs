using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.RegularExpressions;

namespace ServiceProvider.Core.Domain.Equipment
{
    /// <summary>
    /// Represents an assignment of equipment to an inspector with comprehensive lifecycle tracking,
    /// enhanced validation, and security measures.
    /// </summary>
    public class EquipmentAssignment
    {
        #region Properties

        /// <summary>
        /// Unique identifier for the equipment assignment
        /// </summary>
        public int Id { get; private set; }

        /// <summary>
        /// Reference to the assigned equipment item
        /// </summary>
        public int EquipmentId { get; private set; }

        /// <summary>
        /// Navigation property to the assigned equipment
        /// </summary>
        public Equipment Equipment { get; private set; }

        /// <summary>
        /// Reference to the inspector receiving the equipment
        /// </summary>
        public int InspectorId { get; private set; }

        /// <summary>
        /// Date when the equipment was assigned
        /// </summary>
        public DateTime AssignedDate { get; private set; }

        /// <summary>
        /// Date when the equipment was returned, if applicable
        /// </summary>
        public DateTime? ReturnedDate { get; set; }

        /// <summary>
        /// Documented condition of equipment at time of assignment
        /// </summary>
        public string Condition { get; private set; }

        /// <summary>
        /// Documented condition of equipment upon return
        /// </summary>
        public string ReturnCondition { get; set; }

        /// <summary>
        /// Additional notes and comments about the assignment
        /// </summary>
        public string Notes { get; set; }

        /// <summary>
        /// Indicates if this is the current active assignment
        /// </summary>
        public bool IsActive { get; private set; }

        /// <summary>
        /// Timestamp of when the assignment was created
        /// </summary>
        public DateTime CreatedAt { get; private set; }

        /// <summary>
        /// Timestamp of the last modification to the assignment
        /// </summary>
        public DateTime? ModifiedAt { get; private set; }

        /// <summary>
        /// Username of the last person to modify the assignment
        /// </summary>
        public string LastModifiedBy { get; private set; }

        /// <summary>
        /// Historical record of condition changes during the assignment
        /// </summary>
        [NotMapped]
        public List<ConditionChange> ConditionHistory { get; private set; }

        #endregion

        #region Constructor

        /// <summary>
        /// Creates a new equipment assignment instance with enhanced validation
        /// </summary>
        /// <param name="equipmentId">ID of the equipment being assigned</param>
        /// <param name="inspectorId">ID of the inspector receiving the equipment</param>
        /// <param name="condition">Initial condition of the equipment</param>
        /// <exception cref="ArgumentException">Thrown when parameters are invalid</exception>
        public EquipmentAssignment(int equipmentId, int inspectorId, string condition)
        {
            ValidateConstructorParameters(equipmentId, inspectorId, condition);

            EquipmentId = equipmentId;
            InspectorId = inspectorId;
            Condition = SanitizeCondition(condition);
            AssignedDate = DateTime.UtcNow;
            IsActive = true;
            CreatedAt = DateTime.UtcNow;
            Notes = string.Empty;
            ConditionHistory = new List<ConditionChange>
            {
                new ConditionChange
                {
                    ChangeDate = AssignedDate,
                    PreviousCondition = null,
                    NewCondition = Condition,
                    ChangeType = "Initial Assignment"
                }
            };
        }

        #endregion

        #region Public Methods

        /// <summary>
        /// Completes the return process with enhanced validation and audit trail
        /// </summary>
        /// <param name="condition">Condition of equipment upon return</param>
        /// <param name="notes">Additional notes about the return</param>
        /// <exception cref="InvalidOperationException">Thrown when assignment is not active</exception>
        /// <exception cref="ArgumentException">Thrown when parameters are invalid</exception>
        public void CompleteReturn(string condition, string notes)
        {
            if (!IsActive)
            {
                throw new InvalidOperationException("Cannot complete return for an inactive assignment");
            }

            ValidateReturnParameters(condition, notes);

            var sanitizedCondition = SanitizeCondition(condition);
            var sanitizedNotes = SanitizeNotes(notes);

            ReturnedDate = DateTime.UtcNow;
            ReturnCondition = sanitizedCondition;
            Notes = sanitizedNotes;
            IsActive = false;
            ModifiedAt = DateTime.UtcNow;

            ConditionHistory.Add(new ConditionChange
            {
                ChangeDate = ReturnedDate.Value,
                PreviousCondition = Condition,
                NewCondition = ReturnCondition,
                ChangeType = "Return",
                Notes = sanitizedNotes
            });
        }

        /// <summary>
        /// Updates assignment notes with validation and audit
        /// </summary>
        /// <param name="notes">New notes content</param>
        /// <exception cref="ArgumentException">Thrown when notes are invalid</exception>
        public void UpdateNotes(string notes)
        {
            if (string.IsNullOrWhiteSpace(notes))
            {
                throw new ArgumentException("Notes cannot be empty", nameof(notes));
            }

            if (notes.Length > 1000)
            {
                throw new ArgumentException("Notes cannot exceed 1000 characters", nameof(notes));
            }

            Notes = SanitizeNotes(notes);
            ModifiedAt = DateTime.UtcNow;
        }

        #endregion

        #region Private Methods

        private void ValidateConstructorParameters(int equipmentId, int inspectorId, string condition)
        {
            if (equipmentId <= 0)
            {
                throw new ArgumentException("Equipment ID must be greater than 0", nameof(equipmentId));
            }

            if (inspectorId <= 0)
            {
                throw new ArgumentException("Inspector ID must be greater than 0", nameof(inspectorId));
            }

            if (string.IsNullOrWhiteSpace(condition))
            {
                throw new ArgumentException("Condition must be specified", nameof(condition));
            }

            if (condition.Length > 500)
            {
                throw new ArgumentException("Condition cannot exceed 500 characters", nameof(condition));
            }
        }

        private void ValidateReturnParameters(string condition, string notes)
        {
            if (string.IsNullOrWhiteSpace(condition))
            {
                throw new ArgumentException("Return condition must be specified", nameof(condition));
            }

            if (condition.Length > 500)
            {
                throw new ArgumentException("Condition cannot exceed 500 characters", nameof(condition));
            }

            if (notes?.Length > 1000)
            {
                throw new ArgumentException("Notes cannot exceed 1000 characters", nameof(notes));
            }
        }

        private string SanitizeCondition(string condition)
        {
            if (string.IsNullOrWhiteSpace(condition))
            {
                return string.Empty;
            }

            // Remove any HTML tags and normalize whitespace
            var sanitized = Regex.Replace(condition, "<.*?>", string.Empty);
            sanitized = Regex.Replace(sanitized, @"\s+", " ").Trim();
            
            return sanitized;
        }

        private string SanitizeNotes(string notes)
        {
            if (string.IsNullOrWhiteSpace(notes))
            {
                return string.Empty;
            }

            // Remove any HTML tags and normalize whitespace
            var sanitized = Regex.Replace(notes, "<.*?>", string.Empty);
            sanitized = Regex.Replace(sanitized, @"\s+", " ").Trim();

            return sanitized;
        }

        #endregion

        #region Nested Types

        /// <summary>
        /// Represents a change in equipment condition during the assignment
        /// </summary>
        public class ConditionChange
        {
            public int EquipmentAssignmentId { get; set; }
            public DateTime ChangeDate { get; set; }
            public string PreviousCondition { get; set; }
            public string NewCondition { get; set; }
            public string ChangeType { get; set; }
            public string Notes { get; set; }
        }

        #endregion
    }
}
