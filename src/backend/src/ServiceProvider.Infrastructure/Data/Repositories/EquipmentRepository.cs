using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Equipment;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Ardalis.GuardClauses;
using Microsoft.EntityFrameworkCore.Storage; // v4.0.1

namespace ServiceProvider.Infrastructure.Data.Repositories
{
    /// <summary>
    /// Repository implementation for equipment-related data access operations with enhanced validation,
    /// error handling, and performance optimizations.
    /// </summary>
    public class EquipmentRepository : IEquipmentRepository
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<EquipmentRepository> _logger;

        public EquipmentRepository(IApplicationDbContext context, ILogger<EquipmentRepository> logger)
        {
            _context = Guard.Against.Null(context, nameof(context));
            _logger = Guard.Against.Null(logger, nameof(logger));

            _logger.LogInformation("Equipment repository initialized");
        }

        /// <summary>
        /// Retrieves equipment by ID with optimized query performance.
        /// </summary>
        /// <param name="id">Equipment identifier</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Equipment entity with eager-loaded assignments</returns>
        public async Task<Equipment> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        {
            Guard.Against.NegativeOrZero(id, nameof(id));
            _logger.LogDebug("Retrieving equipment with ID: {Id}", id);

            return await _context.Equipment
                .AsNoTracking()
                .Include(e => e.Assignments)
                .Include(e => e.History)
                .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        }

        /// <summary>
        /// Retrieves equipment by serial number with validation.
        /// </summary>
        /// <param name="serialNumber">Equipment serial number</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Equipment entity if found</returns>
        public async Task<Equipment> GetBySerialNumberAsync(string serialNumber, CancellationToken cancellationToken = default)
        {
            Guard.Against.NullOrWhiteSpace(serialNumber, nameof(serialNumber));
            _logger.LogDebug("Retrieving equipment with serial number: {SerialNumber}", serialNumber);

            return await _context.Equipment
                .AsNoTracking()
                .Include(e => e.Assignments)
                .Include(e => e.History)
                .FirstOrDefaultAsync(e => e.SerialNumber == serialNumber, cancellationToken);
        }

        /// <summary>
        /// Retrieves all available equipment with pagination support.
        /// </summary>
        /// <param name="pageSize">Items per page</param>
        /// <param name="pageNumber">Page number (1-based)</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Paginated list of available equipment</returns>
        public async Task<(List<Equipment> Items, int TotalCount)> GetAvailableEquipmentAsync(
            int pageSize = 20,
            int pageNumber = 1,
            CancellationToken cancellationToken = default)
        {
            Guard.Against.NegativeOrZero(pageSize, nameof(pageSize));
            Guard.Against.NegativeOrZero(pageNumber, nameof(pageNumber));

            var query = _context.Equipment
                .AsNoTracking()
                .Where(e => e.IsActive && e.IsAvailable)
                .OrderBy(e => e.Type)
                .ThenBy(e => e.SerialNumber);

            var totalCount = await query.CountAsync(cancellationToken);
            var items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Include(e => e.History)
                .ToListAsync(cancellationToken);

            _logger.LogInformation("Retrieved {Count} available equipment items (Page {Page})", items.Count, pageNumber);
            return (items, totalCount);
        }

        /// <summary>
        /// Assigns equipment to an inspector with enhanced validation and concurrency handling.
        /// </summary>
        /// <param name="equipmentId">Equipment identifier</param>
        /// <param name="inspectorId">Inspector identifier</param>
        /// <param name="condition">Equipment condition at assignment</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Created assignment record</returns>
        public async Task<EquipmentAssignment> AssignToInspectorAsync(
            int equipmentId,
            int inspectorId,
            string condition,
            CancellationToken cancellationToken = default)
        {
            Guard.Against.NegativeOrZero(equipmentId, nameof(equipmentId));
            Guard.Against.NegativeOrZero(inspectorId, nameof(inspectorId));
            Guard.Against.NullOrWhiteSpace(condition, nameof(condition));

            _logger.LogInformation(
                "Assigning equipment {EquipmentId} to inspector {InspectorId}",
                equipmentId,
                inspectorId);

            var equipment = await _context.Equipment
                .Include(e => e.Assignments)
                .FirstOrDefaultAsync(e => e.Id == equipmentId, cancellationToken);

            if (equipment == null)
            {
                throw new InvalidOperationException($"Equipment with ID {equipmentId} not found.");
            }

            var assignment = equipment.AssignToInspector(inspectorId, condition);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Equipment {EquipmentId} successfully assigned to inspector {InspectorId}",
                equipmentId,
                inspectorId);

            return assignment;
        }

        /// <summary>
        /// Processes equipment return with condition tracking and history updates.
        /// </summary>
        /// <param name="equipmentId">Equipment identifier</param>
        /// <param name="condition">Return condition</param>
        /// <param name="notes">Optional return notes</param>
        /// <param name="cancellationToken">Cancellation token</param>
        public async Task ProcessReturnAsync(
            int equipmentId,
            string condition,
            string notes = null,
            CancellationToken cancellationToken = default)
        {
            Guard.Against.NegativeOrZero(equipmentId, nameof(equipmentId));
            Guard.Against.NullOrWhiteSpace(condition, nameof(condition));

            _logger.LogInformation("Processing return for equipment {EquipmentId}", equipmentId);

            var equipment = await _context.Equipment
                .Include(e => e.Assignments)
                .Include(e => e.History)
                .FirstOrDefaultAsync(e => e.Id == equipmentId, cancellationToken);

            if (equipment == null)
            {
                throw new InvalidOperationException($"Equipment with ID {equipmentId} not found.");
            }

            equipment.ReturnFromAssignment(condition, notes);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Equipment {EquipmentId} return processed successfully", equipmentId);
        }

        /// <summary>
        /// Updates equipment maintenance record with validation.
        /// </summary>
        /// <param name="equipmentId">Equipment identifier</param>
        /// <param name="description">Maintenance description</param>
        /// <param name="cancellationToken">Cancellation token</param>
        public async Task RecordMaintenanceAsync(
            int equipmentId,
            string description,
            CancellationToken cancellationToken = default)
        {
            Guard.Against.NegativeOrZero(equipmentId, nameof(equipmentId));
            Guard.Against.NullOrWhiteSpace(description, nameof(description));

            _logger.LogInformation("Recording maintenance for equipment {EquipmentId}", equipmentId);

            var equipment = await _context.Equipment
                .Include(e => e.History)
                .FirstOrDefaultAsync(e => e.Id == equipmentId, cancellationToken);

            if (equipment == null)
            {
                throw new InvalidOperationException($"Equipment with ID {equipmentId} not found.");
            }

            equipment.RecordMaintenance(description);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Maintenance recorded for equipment {EquipmentId}", equipmentId);
        }

        public async Task<bool> CheckConcurrentAssignmentAsync(int commandEquipmentId, CancellationToken cancellationToken)
        {
            Guard.Against.NegativeOrZero(commandEquipmentId, nameof(commandEquipmentId));
            _logger.LogDebug("Checking concurrent assignment for equipment ID: {CommandEquipmentId}", commandEquipmentId);

            var equipment = await _context.Equipment
                .Include(e => e.Assignments)
                .FirstOrDefaultAsync(e => e.Id == commandEquipmentId, cancellationToken);

            if (equipment == null)
            {
                throw new InvalidOperationException($"Equipment with ID {commandEquipmentId} not found.");
            }

            var hasActiveAssignment = equipment.Assignments.Any(a => a.IsActive);
            _logger.LogInformation("Equipment {CommandEquipmentId} has active assignment: {HasActiveAssignment}", commandEquipmentId, hasActiveAssignment);

            return hasActiveAssignment;
        }

        public async Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Beginning a new transaction");
            var transaction = await _context.BeginTransactionAsync(cancellationToken);
            return transaction;
        }
    }
}
