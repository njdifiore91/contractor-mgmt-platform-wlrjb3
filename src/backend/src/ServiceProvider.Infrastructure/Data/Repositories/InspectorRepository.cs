using Microsoft.EntityFrameworkCore;
using Microsoft.Spatial;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Inspectors;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ServiceProvider.Infrastructure.Data.Repositories
{
    /// <summary>
    /// Repository implementation for managing Inspector entities with comprehensive validation,
    /// security measures, and optimized geographic search capabilities.
    /// </summary>
    public class InspectorRepository
    {
        private readonly IApplicationDbContext _context;
        private const double EARTH_RADIUS_MILES = 3959.0;
        private const int MAX_SEARCH_RADIUS = 1000;

        public InspectorRepository(IApplicationDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        /// <summary>
        /// Retrieves an inspector by ID with eager loading of related entities.
        /// </summary>
        /// <param name="id">The inspector ID</param>
        /// <returns>Inspector entity with related data if found, null otherwise</returns>
        public async Task<Inspector> GetByIdAsync(int id)
        {
            if (id <= 0)
                throw new ArgumentException("Inspector ID must be greater than 0.", nameof(id));

            return await _context.Inspectors
                .Include(i => i.User)
                .Include(i => i.Certifications)
                .Include(i => i.DrugTests)
                .Include(i => i.EquipmentAssignments)
                .FirstOrDefaultAsync(i => i.Id == id && i.IsActive);
        }

        /// <summary>
        /// Performs optimized geographic search for inspectors within specified radius.
        /// Uses SQL Spatial indexing for efficient querying.
        /// </summary>
        /// <param name="location">Center point for the search</param>
        /// <param name="radiusInMiles">Search radius in miles</param>
        /// <returns>List of inspectors within the specified radius</returns>
        public async Task<IEnumerable<Inspector>> SearchByLocationAsync(
            GeographyPoint location,
            double radiusInMiles)
        {
            if (location == null)
                throw new ArgumentNullException(nameof(location));

            if (radiusInMiles <= 0 || radiusInMiles > MAX_SEARCH_RADIUS)
                throw new ArgumentException($"Radius must be between 0 and {MAX_SEARCH_RADIUS} miles.", nameof(radiusInMiles));

            // Create spatial query using STDistance for optimized search
            return await _context.Inspectors
                .Include(i => i.Certifications)
                .Include(i => i.DrugTests.OrderByDescending(dt => dt.TestDate).Take(1))
                .Where(i => i.IsActive &&
                           i.Status == InspectorStatus.Available &&
                           i.Location.Distance(location) <= radiusInMiles * EARTH_RADIUS_MILES)
                .OrderBy(i => i.Location.Distance(location))
                .ToListAsync();
        }

        /// <summary>
        /// Adds a new inspector with comprehensive validation.
        /// </summary>
        /// <param name="inspector">The inspector entity to add</param>
        /// <returns>The added inspector entity</returns>
        public async Task<Inspector> AddAsync(Inspector inspector)
        {
            if (inspector == null)
                throw new ArgumentNullException(nameof(inspector));

            ValidateInspector(inspector);

            // Check for duplicate badge number
            if (await _context.Inspectors.AnyAsync(i => i.BadgeNumber == inspector.BadgeNumber))
                throw new InvalidOperationException($"Badge number {inspector.BadgeNumber} is already in use.");

            _context.Inspectors.Add(inspector);
            await _context.SaveChangesAsync();

            return inspector;
        }

        /// <summary>
        /// Updates an inspector with concurrency handling and validation.
        /// </summary>
        /// <param name="inspector">The inspector entity to update</param>
        /// <returns>True if update successful, false if concurrency conflict</returns>
        public async Task<bool> UpdateAsync(Inspector inspector)
        {
            if (inspector == null)
                throw new ArgumentNullException(nameof(inspector));

            ValidateInspector(inspector);

            try
            {
                var entry = _context.Entry(inspector);
                entry.State = EntityState.Modified;

                // Optimistic concurrency check
                await _context.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateConcurrencyException)
            {
                // Handle concurrency conflict
                if (!await InspectorExists(inspector.Id))
                    throw new InvalidOperationException($"Inspector with ID {inspector.Id} no longer exists.");

                return false;
            }
        }

        /// <summary>
        /// Validates inspector entity state.
        /// </summary>
        private void ValidateInspector(Inspector inspector)
        {
            if (string.IsNullOrWhiteSpace(inspector.BadgeNumber))
                throw new ArgumentException("Badge number is required.", nameof(inspector));

            if (inspector.Location == null)
                throw new ArgumentException("Location is required.", nameof(inspector));

            if (inspector.Location.Latitude < -90 || inspector.Location.Latitude > 90)
                throw new ArgumentException("Invalid latitude value.", nameof(inspector));

            if (inspector.Location.Longitude < -180 || inspector.Location.Longitude > 180)
                throw new ArgumentException("Invalid longitude value.", nameof(inspector));

            if (inspector.UserId <= 0)
                throw new ArgumentException("Invalid user ID.", nameof(inspector));
        }

        /// <summary>
        /// Checks if an inspector exists.
        /// </summary>
        private async Task<bool> InspectorExists(int id)
        {
            return await _context.Inspectors.AnyAsync(i => i.Id == id);
        }
    }
}