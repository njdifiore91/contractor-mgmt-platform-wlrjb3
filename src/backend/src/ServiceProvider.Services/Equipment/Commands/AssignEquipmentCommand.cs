using System;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;
using ServiceProvider.Core.Domain.Equipment;
using ServiceProvider.Infrastructure.Data.Repositories;

namespace ServiceProvider.Services.Equipment.Commands
{
    /// <summary>
    /// Command for assigning equipment to an inspector with enhanced validation and audit trail
    /// </summary>
    public class AssignEquipmentCommand : IRequest<EquipmentAssignment>
    {
        public int EquipmentId { get; }
        public int InspectorId { get; }
        public string Condition { get; }
        public DateTime AssignmentDate { get; }
        public string Notes { get; }
        public Guid TransactionId { get; }

        public AssignEquipmentCommand(int equipmentId, int inspectorId, string condition, string notes = null)
        {
            EquipmentId = equipmentId;
            InspectorId = inspectorId;
            Condition = condition;
            AssignmentDate = DateTime.UtcNow;
            Notes = notes;
            TransactionId = Guid.NewGuid();
        }
    }

    /// <summary>
    /// Validator for AssignEquipmentCommand with comprehensive business rules
    /// </summary>
    public class AssignEquipmentCommandValidator : AbstractValidator<AssignEquipmentCommand>
    {
        private readonly IEquipmentRepository _equipmentRepository;
        private readonly IInspectorRepository _inspectorRepository;

        public AssignEquipmentCommandValidator(
            IEquipmentRepository equipmentRepository,
            IInspectorRepository inspectorRepository)
        {
            _equipmentRepository = equipmentRepository ?? throw new ArgumentNullException(nameof(equipmentRepository));
            _inspectorRepository = inspectorRepository ?? throw new ArgumentNullException(nameof(inspectorRepository));

            RuleFor(x => x.EquipmentId)
                .GreaterThan(0)
                .WithMessage("Equipment ID must be greater than 0");

            RuleFor(x => x.InspectorId)
                .GreaterThan(0)
                .WithMessage("Inspector ID must be greater than 0");

            RuleFor(x => x.Condition)
                .NotEmpty()
                .WithMessage("Condition must be specified")
                .MaximumLength(500)
                .WithMessage("Condition cannot exceed 500 characters");

            RuleFor(x => x.Notes)
                .MaximumLength(1000)
                .When(x => x.Notes != null)
                .WithMessage("Notes cannot exceed 1000 characters");

            RuleFor(x => x.AssignmentDate)
                .LessThanOrEqualTo(DateTime.UtcNow.AddHours(24))
                .WithMessage("Assignment date cannot be more than 24 hours in the future");

            RuleFor(x => x)
                .MustAsync(ValidateEquipmentAvailabilityAsync)
                .WithMessage("Equipment is not available for assignment");

            RuleFor(x => x)
                .MustAsync(ValidateInspectorStatusAsync)
                .WithMessage("Inspector is not available for equipment assignment");
        }

        private async Task<bool> ValidateEquipmentAvailabilityAsync(
            AssignEquipmentCommand command,
            CancellationToken cancellationToken)
        {
            var equipment = await _equipmentRepository.GetByIdAsync(command.EquipmentId, cancellationToken);
            return equipment != null && equipment.IsAvailable;
        }

        private async Task<bool> ValidateInspectorStatusAsync(
            AssignEquipmentCommand command,
            CancellationToken cancellationToken)
        {
            var inspector = await _inspectorRepository.GetByIdAsync(command.InspectorId, cancellationToken);
            return inspector != null && inspector.Status == InspectorStatus.Available;
        }
    }

    /// <summary>
    /// Handler for processing AssignEquipmentCommand with transaction management and audit trail
    /// </summary>
    public class AssignEquipmentCommandHandler : IRequestHandler<AssignEquipmentCommand, EquipmentAssignment>
    {
        private readonly IEquipmentRepository _equipmentRepository;
        private readonly ILogger<AssignEquipmentCommandHandler> _logger;

        public AssignEquipmentCommandHandler(
            IEquipmentRepository equipmentRepository,
            ILogger<AssignEquipmentCommandHandler> logger)
        {
            _equipmentRepository = equipmentRepository ?? throw new ArgumentNullException(nameof(equipmentRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<EquipmentAssignment> Handle(
            AssignEquipmentCommand command,
            CancellationToken cancellationToken)
        {
            _logger.LogInformation(
                "Processing equipment assignment request. Transaction ID: {TransactionId}, Equipment ID: {EquipmentId}, Inspector ID: {InspectorId}",
                command.TransactionId,
                command.EquipmentId,
                command.InspectorId);

            try
            {
                // Check for concurrent assignment attempts
                var isConcurrentAssignment = await _equipmentRepository.CheckConcurrentAssignmentAsync(
                    command.EquipmentId,
                    cancellationToken);

                if (isConcurrentAssignment)
                {
                    throw new InvalidOperationException("Concurrent assignment attempt detected");
                }

                // Get equipment and verify availability
                var equipment = await _equipmentRepository.GetByIdAsync(command.EquipmentId, cancellationToken);
                if (equipment == null || !equipment.IsAvailable)
                {
                    throw new InvalidOperationException($"Equipment {command.EquipmentId} is not available for assignment");
                }

                // Perform assignment
                var assignment = await _equipmentRepository.AssignToInspectorAsync(
                    command.EquipmentId,
                    command.InspectorId,
                    command.Condition,
                    cancellationToken);

                _logger.LogInformation(
                    "Equipment assignment completed successfully. Transaction ID: {TransactionId}",
                    command.TransactionId);

                return assignment;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error processing equipment assignment. Transaction ID: {TransactionId}",
                    command.TransactionId);
                throw;
            }
        }
    }
}