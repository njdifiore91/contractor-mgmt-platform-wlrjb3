using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.Spatial; // v7.12.2
using Microsoft.EntityFrameworkCore; // v6.0.0

namespace ServiceProvider.Core.Domain.Inspectors
{
    /// <summary>
    /// Represents a mobilization record for an inspector with enhanced location validation,
    /// audit trails, and North American geographic constraints.
    /// </summary>
    public class Mobilization
    {
        // North American geographic boundaries
        private const double MinLatitude = 15.0;  // Southern limit (Mexico)
        private const double MaxLatitude = 85.0;  // Northern limit (Canada)
        private const double MinLongitude = -170.0; // Western limit (Alaska)
        private const double MaxLongitude = -50.0;  // Eastern limit (Canada)

        public int Id { get; private set; }
        public int InspectorId { get; private set; }
        public virtual Inspector Inspector { get; private set; }
        public GeographyPoint Location { get; private set; }
        public string ProjectCode { get; private set; }
        public string SiteAddress { get; private set; }
        public DateTime StartDate { get; private set; }
        public DateTime? EndDate { get; private set; }
        public string Notes { get; private set; }
        public bool IsActive { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime? ModifiedAt { get; private set; }
        [Timestamp]
        public byte[] RowVersion { get; private set; }

        /// <summary>
        /// Creates a new mobilization record with enhanced validation for North American operations.
        /// </summary>
        /// <param name="inspectorId">The ID of the inspector being mobilized</param>
        /// <param name="location">Geographic location of the mobilization site</param>
        /// <param name="projectCode">Unique project identifier (format: XX-NNNNNN)</param>
        /// <param name="siteAddress">Physical address of the mobilization site</param>
        /// <param name="startDate">Planned start date of the mobilization</param>
        /// <exception cref="ArgumentException">Thrown when validation fails</exception>
        public Mobilization(int inspectorId, GeographyPoint location, string projectCode, 
            string siteAddress, DateTime startDate)
        {
            if (inspectorId <= 0)
                throw new ArgumentException("Inspector ID must be greater than 0.", nameof(inspectorId));

            if (!ValidateNorthAmericanBounds(location))
                throw new ArgumentException("Location must be within North American boundaries.", nameof(location));

            if (string.IsNullOrWhiteSpace(projectCode) || !System.Text.RegularExpressions.Regex.IsMatch(projectCode, @"^[A-Z]{2}-\d{6}$"))
                throw new ArgumentException("Project code must match format XX-NNNNNN.", nameof(projectCode));

            if (string.IsNullOrWhiteSpace(siteAddress))
                throw new ArgumentException("Site address cannot be empty.", nameof(siteAddress));

            var utcNow = DateTime.UtcNow;
            if (startDate.Date < utcNow.Date)
                throw new ArgumentException("Start date cannot be in the past.", nameof(startDate));

            if (startDate.Date > utcNow.Date.AddDays(30))
                throw new ArgumentException("Start date cannot be more than 30 days in the future.", nameof(startDate));

            InspectorId = inspectorId;
            Location = location;
            ProjectCode = projectCode.ToUpperInvariant();
            SiteAddress = siteAddress.Trim();
            StartDate = startDate.Date;
            IsActive = true;
            CreatedAt = utcNow;
        }

        /// <summary>
        /// Completes the mobilization with enhanced validation and audit trail.
        /// </summary>
        /// <param name="endDate">The completion date of the mobilization</param>
        /// <exception cref="InvalidOperationException">Thrown when mobilization cannot be completed</exception>
        /// <exception cref="ArgumentException">Thrown when end date is invalid</exception>
        public void Complete(DateTime endDate)
        {
            if (!IsActive)
                throw new InvalidOperationException("Cannot complete an inactive mobilization.");

            if (endDate.Date < StartDate.Date)
                throw new ArgumentException("End date cannot be before start date.", nameof(endDate));

            if (endDate.Date > DateTime.UtcNow.Date)
                throw new ArgumentException("End date cannot be in the future.", nameof(endDate));

            EndDate = endDate.Date;
            IsActive = false;
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Updates location with North American boundary validation.
        /// </summary>
        /// <param name="newLocation">New geographic location for the mobilization</param>
        /// <exception cref="InvalidOperationException">Thrown when mobilization is inactive</exception>
        /// <exception cref="ArgumentException">Thrown when location is invalid</exception>
        public void UpdateLocation(GeographyPoint newLocation)
        {
            if (!IsActive)
                throw new InvalidOperationException("Cannot update location of an inactive mobilization.");

            if (!ValidateNorthAmericanBounds(newLocation))
                throw new ArgumentException("New location must be within North American boundaries.", nameof(newLocation));

            Location = newLocation;
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Validates coordinates are within North American boundaries.
        /// </summary>
        /// <param name="location">Location to validate</param>
        /// <returns>True if coordinates are valid for North America</returns>
        private bool ValidateNorthAmericanBounds(GeographyPoint location)
        {
            if (location == null)
                return false;

            var latitude = location.Latitude;
            var longitude = location.Longitude;

            return latitude >= MinLatitude && latitude <= MaxLatitude &&
                   longitude >= MinLongitude && longitude <= MaxLongitude;
        }

        /// <summary>
        /// Updates the notes for this mobilization record.
        /// </summary>
        /// <param name="notes">New notes content</param>
        /// <exception cref="InvalidOperationException">Thrown when mobilization is inactive</exception>
        public void UpdateNotes(string notes)
        {
            if (!IsActive)
                throw new InvalidOperationException("Cannot update notes of an inactive mobilization.");

            Notes = notes?.Trim();
            ModifiedAt = DateTime.UtcNow;
        }

        // Protected constructor for EF Core
        protected Mobilization() { }
    }
}
