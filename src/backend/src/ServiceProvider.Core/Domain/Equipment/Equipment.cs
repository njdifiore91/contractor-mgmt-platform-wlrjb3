using System;
using System.Collections.Generic;
using ServiceProvider.Core.Domain.Equipment;

namespace ServiceProvider.Core.Domain.Equipment
{
    /// <summary>
    /// Represents an equipment item that can be assigned to inspectors, with comprehensive tracking 
    /// of its lifecycle, assignments, and maintenance history.
    /// </summary>
    public class Equipment
    {
        #region Properties

        /// <summary>
        /// Unique identifier for the equipment item
        /// </summary>
        public int Id { get; private set; }

        /// <summary>
        /// Manufacturer serial number or unique tracking identifier
        /// </summary>
        public string SerialNumber { get; private set; }

        /// <summary>
        /// Equipment model or product identifier
        /// </summary>
        public string Model { get; private set; }

        /// <summary>
        /// Category classification of the equipment
        /// </summary>
        public EquipmentType Type { get; private set; }

        /// <summary>
        /// Current physical condition of the equipment
        /// </summary>
        public string Condition { get; private set; }

        /// <summary>
        /// Indicates if the equipment is still in active inventory
        /// </summary>
        public bool IsActive { get; private set; }

        /// <summary>
        /// Indicates if the equipment is available for assignment
        /// </summary>
        public bool IsAvailable { get; private set; }

        /// <summary>
        /// Date when the equipment was acquired
        /// </summary>
        public DateTime PurchaseDate { get; private set; }

        /// <summary>
        /// Date of the most recent maintenance activity
        /// </summary>
        public DateTime? LastMaintenanceDate { get; private set; }

        /// <summary>
        /// Additional notes and comments about the equipment
        /// </summary>
        public string Notes { get; private set; }

        /// <summary>
        /// Collection of all assignments for this equipment
        /// </summary>
        public ICollection<EquipmentAssignment> Assignments { get; private set; }

        /// <summary>
        /// Historical record of all equipment events and changes
        /// </summary>
        public ICollection<EquipmentHistory> History { get; private set; }

        #endregion

        #region Constructor

        /// <summary>
        /// Creates a new equipment instance with required validation and initialization
        /// </summary>
        /// <param name="serialNumber">Unique serial number for the equipment</param>
        /// <param name="model">Equipment model identifier</param>
        /// <param name="type">Equipment category classification</param>
        /// <exception cref="ArgumentNullException">Thrown when required parameters are null or empty</exception>
        /// <exception cref="ArgumentException">Thrown when equipment type is invalid</exception>
        public Equipment(string serialNumber, string model, EquipmentType type)
        {
            if (string.IsNullOrWhiteSpace(serialNumber))
                throw new ArgumentNullException(nameof(serialNumber), "Serial number is required");

            if (string.IsNullOrWhiteSpace(model))
                throw new ArgumentNullException(nameof(model), "Model is required");

            if (!Enum.IsDefined(typeof(EquipmentType), type))
                throw new ArgumentException("Invalid equipment type", nameof(type));

            SerialNumber = serialNumber;
            Model = model;
            Type = type;
            IsActive = true;
            IsAvailable = true;
            PurchaseDate = DateTime.UtcNow;
            Condition = "New";
            Notes = string.Empty;

            Assignments = new List<EquipmentAssignment>();
            History = new List<EquipmentHistory>();

            //// Record initial history entry
            //History.Add(new EquipmentHistory
            //{
            //    EventDate = PurchaseDate,
            //    EventType = "Created",
            //    Description = $"Equipment added to inventory: {Type} - {Model}",
            //    PreviousState = null,
            //    NewState = "New"
            //});
        }

        #endregion

        #region Public Methods

        /// <summary>
        /// Creates a new assignment for this equipment to an inspector
        /// </summary>
        /// <param name="inspectorId">ID of the inspector receiving the equipment</param>
        /// <param name="condition">Current condition at time of assignment</param>
        /// <returns>New assignment record</returns>
        /// <exception cref="InvalidOperationException">Thrown when equipment is not available</exception>
        /// <exception cref="ArgumentException">Thrown when parameters are invalid</exception>
        public EquipmentAssignment AssignToInspector(int inspectorId, string condition)
        {
            if (!IsAvailable)
                throw new InvalidOperationException("Equipment is not available for assignment");

            if (inspectorId <= 0)
                throw new ArgumentException("Invalid inspector ID", nameof(inspectorId));

            if (string.IsNullOrWhiteSpace(condition))
                throw new ArgumentException("Condition must be specified", nameof(condition));

            var assignment = new EquipmentAssignment(Id, inspectorId, condition);

            Assignments.Add(assignment);
            IsAvailable = false;

            History.Add(new EquipmentHistory(Id, "Assigned", "Available", "Assigned", "System", "Admin"));
            //{
            //    EventDate = assignment.AssignmentDate,
            //    EventType = "Assigned",
            //    Description = $"Assigned to Inspector ID: {inspectorId}",
            //    PreviousState = "Available",
            //    NewState = "Assigned"
            //});

            return assignment;
        }

        /// <summary>
        /// Processes the return of equipment from an assignment
        /// </summary>
        /// <param name="condition">Condition of equipment upon return</param>
        /// <param name="notes">Additional notes about the return</param>
        /// <exception cref="InvalidOperationException">Thrown when no active assignment exists</exception>
        /// <exception cref="ArgumentException">Thrown when condition is not specified</exception>
        public void ReturnFromAssignment(string condition, string notes = null)
        {
            var activeAssignment = GetActiveAssignment();
            if (activeAssignment == null)
                throw new InvalidOperationException("No active assignment found");

            if (string.IsNullOrWhiteSpace(condition))
                throw new ArgumentException("Return condition must be specified", nameof(condition));

            activeAssignment.ReturnedDate = DateTime.UtcNow;
            activeAssignment.ReturnCondition = condition;
            activeAssignment.Notes = notes;

            Condition = condition;
            IsAvailable = true;

            History.Add(new EquipmentHistory(
                Id,
                "Returned",
                "Assigned",
                "Available",
                "System",
                "Admin")
            {
                EventDate = activeAssignment.ReturnedDate.Value,
                Notes = notes,
                //Description = $"Returned from Inspector ID: {activeAssignment.InspectorId}"
            });
        }

        /// <summary>
        /// Updates the condition of the equipment
        /// </summary>
        /// <param name="newCondition">New condition state</param>
        /// <exception cref="ArgumentException">Thrown when condition is not specified</exception>
        public void UpdateCondition(string newCondition)
        {
            if (string.IsNullOrWhiteSpace(newCondition))
                throw new ArgumentException("New condition must be specified", nameof(newCondition));

            var previousCondition = Condition;
            Condition = newCondition;

            History.Add(new EquipmentHistory(
            Id,
            "ConditionUpdate",
            previousCondition,
            newCondition,
            "System",
            "Admin")
            {
                EventDate = DateTime.UtcNow,
                Notes = "Condition updated",
                //Description = $"Returned from Inspector ID: {activeAssignment.InspectorId}"
            });

            //History.Add(new EquipmentHistory
            //{
            //    EventDate = DateTime.UtcNow,
            //    EventType = "ConditionUpdate",
            //    Description = "Condition updated",
            //    PreviousState = previousCondition,
            //    NewState = newCondition
            //});

            // Update maintenance date if condition improved
            if (IsConditionImproved(previousCondition, newCondition))
            {
                LastMaintenanceDate = DateTime.UtcNow;
            }
        }

        /// <summary>
        /// Records a maintenance activity on the equipment
        /// </summary>
        /// <param name="description">Description of maintenance performed</param>
        /// <exception cref="ArgumentException">Thrown when description is not specified</exception>
        public void RecordMaintenance(string description)
        {
            if (string.IsNullOrWhiteSpace(description))
                throw new ArgumentException("Maintenance description must be specified", nameof(description));

            LastMaintenanceDate = DateTime.UtcNow;

            History.Add(new EquipmentHistory(
                Id,
                "Maintenance",
                Condition,
                Condition,
                "System",
                "Admin")
            {
                EventDate = LastMaintenanceDate.Value,
            });

            Notes = string.IsNullOrEmpty(Notes) 
                ? $"Maintenance: {description}" 
                : $"{Notes}\nMaintenance: {description}";
        }

        #endregion

        #region Private Methods

        private EquipmentAssignment GetActiveAssignment()
        {
            return Assignments.FirstOrDefault(a => !a.ReturnedDate.HasValue);
        }

        private bool IsConditionImproved(string previousCondition, string newCondition)
        {
            // Simple condition comparison - can be enhanced based on business rules
            return !string.Equals(previousCondition, "New", StringComparison.OrdinalIgnoreCase) &&
                   string.Equals(newCondition, "New", StringComparison.OrdinalIgnoreCase);
        }

        #endregion
    }
}
