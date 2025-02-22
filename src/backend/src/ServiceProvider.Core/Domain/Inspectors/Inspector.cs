using System;
using System.Collections.Generic;
using Microsoft.Spatial; // v7.12.2
using ServiceProvider.Core.Domain.Users;

namespace ServiceProvider.Core.Domain.Inspectors
{
    /// <summary>
    /// Represents an inspector entity in the service provider management system.
    /// Implements core inspector profile management, status tracking, and geographic location functionality.
    /// </summary>
    public class Inspector
    {
        private const double MaxLatitude = 90.0;
        private const double MinLatitude = -90.0;
        private const double MaxLongitude = 180.0;
        private const double MinLongitude = -180.0;

        public int Id { get; private set; }
        public int UserId { get; private set; }
        public virtual User User { get; private set; }
        public InspectorStatus Status { get; private set; }
        public GeographyPoint Location { get; private set; }
        public string BadgeNumber { get; private set; }
        public virtual ICollection<Certification> Certifications { get; private set; }
        public virtual ICollection<DrugTest> DrugTests { get; private set; }
        public virtual ICollection<EquipmentAssignment> EquipmentAssignments { get; private set; }
        public DateTime? LastMobilizedDate { get; private set; }
        public DateTime? LastDrugTestDate { get; private set; }
        public bool IsActive { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime? ModifiedAt { get; private set; }

        /// <summary>
        /// Initializes a new instance of the Inspector class with required validation.
        /// </summary>
        /// <param name="userId">The associated User entity ID</param>
        /// <param name="badgeNumber">Unique inspector badge identifier</param>
        /// <param name="location">Geographic location as SQL Spatial point</param>
        /// <exception cref="ArgumentException">Thrown when validation fails</exception>
        public Inspector(int userId, string badgeNumber, GeographyPoint location)
        {
            if (userId <= 0)
                throw new ArgumentException("User ID must be greater than 0.", nameof(userId));

            if (string.IsNullOrWhiteSpace(badgeNumber))
                throw new ArgumentException("Badge number cannot be empty.", nameof(badgeNumber));

            ValidateLocation(location);

            UserId = userId;
            BadgeNumber = badgeNumber;
            Location = location;
            Status = InspectorStatus.Inactive;
            IsActive = true;
            CreatedAt = DateTime.UtcNow;

            Certifications = new HashSet<Certification>();
            DrugTests = new HashSet<DrugTest>();
            EquipmentAssignments = new HashSet<EquipmentAssignment>();
        }

        /// <summary>
        /// Updates the inspector's geographic location with SQL Spatial validation.
        /// </summary>
        /// <param name="newLocation">New geographic location</param>
        /// <exception cref="ArgumentException">Thrown when location coordinates are invalid</exception>
        public void UpdateLocation(GeographyPoint newLocation)
        {
            ValidateLocation(newLocation);
            Location = newLocation;
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Changes inspector status to Mobilized and records the mobilization date.
        /// </summary>
        /// <exception cref="InvalidOperationException">Thrown when current status prevents mobilization</exception>
        public void Mobilize()
        {
            if (Status != InspectorStatus.Available)
                throw new InvalidOperationException("Inspector must be in Available status to be mobilized.");

            Status = InspectorStatus.Mobilized;
            LastMobilizedDate = DateTime.UtcNow;
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Changes inspector status back to Available from Mobilized state.
        /// </summary>
        /// <exception cref="InvalidOperationException">Thrown when current status prevents demobilization</exception>
        public void Demobilize()
        {
            if (Status != InspectorStatus.Mobilized)
                throw new InvalidOperationException("Inspector must be in Mobilized status to be demobilized.");

            Status = InspectorStatus.Available;
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Records a new drug test for the inspector.
        /// </summary>
        /// <param name="drugTest">Drug test record to add</param>
        /// <exception cref="ArgumentNullException">Thrown when drug test is null</exception>
        public void RecordDrugTest(DrugTest drugTest)
        {
            if (drugTest == null)
                throw new ArgumentNullException(nameof(drugTest));

            DrugTests.Add(drugTest);
            LastDrugTestDate = drugTest.TestDate;
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Validates geographic coordinates for SQL Spatial compatibility.
        /// </summary>
        /// <param name="location">Location to validate</param>
        /// <exception cref="ArgumentException">Thrown when coordinates are invalid</exception>
        private void ValidateLocation(GeographyPoint location)
        {
            if (location == null)
                throw new ArgumentException("Location cannot be null.", nameof(location));

            var latitude = location.Latitude;
            var longitude = location.Longitude;

            if (latitude < MinLatitude || latitude > MaxLatitude)
                throw new ArgumentException($"Latitude must be between {MinLatitude} and {MaxLatitude}.", nameof(location));

            if (longitude < MinLongitude || longitude > MaxLongitude)
                throw new ArgumentException($"Longitude must be between {MinLongitude} and {MaxLongitude}.", nameof(location));
        }

        // Protected constructor for EF Core
        protected Inspector() { }
    }
}