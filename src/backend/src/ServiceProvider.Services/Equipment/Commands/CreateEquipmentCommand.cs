using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation; // v11.0.0
using MediatR; // v11.0.0
using Microsoft.Extensions.Logging;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Equipment;
using ServiceProvider.Core.Domain.Audit;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace ServiceProvider.Services.Equipment.Commands
{
    /// <summary>
    /// Command for creating new equipment items with comprehensive validation and security
    /// </summary>
    public class CreateEquipmentCommand : IRequest<int>
    {
        public string SerialNumber { get; }
        public string Model { get; }
        public EquipmentType Type { get; }
        public string Condition { get; }
        public string Notes { get; }
        public DateTime CreatedDate { get; }
        public string CreatedBy { get; }
        public Dictionary<string, string> Metadata { get; }

        public CreateEquipmentCommand(
            string serialNumber,
            string model,
            EquipmentType type,
            string condition,
            string notes,
            string createdBy)
        {
            SerialNumber = serialNumber;
            Model = model;
            Type = type;
            Condition = condition;
            Notes = notes?.Trim();
            CreatedBy = createdBy;
            CreatedDate = DateTime.UtcNow;
            Metadata = new Dictionary<string, string>();
        }
    }

    /// <summary>
    /// Validator for CreateEquipmentCommand with comprehensive business rules
    /// </summary>
    public sealed class CreateEquipmentCommandValidator : AbstractValidator<CreateEquipmentCommand>
    {
        public CreateEquipmentCommandValidator()
        {
            RuleFor(x => x.SerialNumber)
                .NotEmpty()
                .MaximumLength(50)
                .Matches(@"^[A-Z0-9]{2,50}$")
                .WithMessage("Serial number must be 2-50 alphanumeric characters");

            RuleFor(x => x.Model)
                .NotEmpty()
                .MaximumLength(100)
                .Matches(@"^[A-Za-z0-9\-\s]{2,100}$")
                .WithMessage("Model must be 2-100 alphanumeric characters, spaces, or hyphens");

            RuleFor(x => x.Type)
                .IsInEnum()
                .WithMessage("Invalid equipment type");

            RuleFor(x => x.Condition)
                .NotEmpty()
                .MaximumLength(50)
                .Must(x => new[] { "New", "Used", "Refurbished" }.Contains(x))
                .WithMessage("Condition must be New, Used, or Refurbished");

            RuleFor(x => x.Notes)
                .MaximumLength(500)
                .When(x => !string.IsNullOrEmpty(x.Notes));

            RuleFor(x => x.CreatedBy)
                .NotEmpty()
                .MaximumLength(50);
        }
    }

    /// <summary>
    /// Handler for CreateEquipmentCommand with comprehensive error handling and auditing
    /// </summary>
    public sealed class CreateEquipmentCommandHandler : IRequestHandler<CreateEquipmentCommand, int>
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<CreateEquipmentCommandHandler> _logger;
        private readonly IValidator<CreateEquipmentCommand> _validator;

        public CreateEquipmentCommandHandler(
            IApplicationDbContext context,
            ILogger<CreateEquipmentCommandHandler> logger,
            IValidator<CreateEquipmentCommand> validator)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        }

        public async Task<int> Handle(CreateEquipmentCommand command, CancellationToken cancellationToken)
        {
            try
            {
                // Validate command
                var validationResult = await _validator.ValidateAsync(command, cancellationToken);
                if (!validationResult.IsValid)
                {
                    throw new ValidationException(validationResult.Errors);
                }

                // Check for duplicate serial number
                var existingEquipment = await _context.Equipment
                    .FirstOrDefaultAsync(e => e.SerialNumber == command.SerialNumber, cancellationToken);
                
                if (existingEquipment != null)
                {
                    throw new InvalidOperationException($"Equipment with serial number {command.SerialNumber} already exists");
                }

                // Create new equipment
                var equipment = new Core.Domain.Equipment.Equipment(
                    command.SerialNumber,
                    command.Model,
                    command.Type);

                // Update additional properties
                equipment.UpdateCondition(command.Condition);
                if (!string.IsNullOrEmpty(command.Notes))
                {
                    equipment.RecordMaintenance(command.Notes);
                }

                // Begin transaction
                await using var transaction = await _context.BeginTransactionAsync(cancellationToken);

                try
                {
                    // Add equipment
                    _context.Equipment.Add(equipment);

                    // Create audit log
                    var auditLog = new AuditLog(
                        "Equipment",
                        equipment.SerialNumber,
                        "Create",
                        JsonSerializer.Serialize(new
                        {
                            command.SerialNumber,
                            command.Model,
                            command.Type,
                            command.Condition,
                            command.Notes,
                            command.CreatedBy,
                            command.CreatedDate
                        }),
                        "0.0.0.0", // IP address should be passed from higher layer
                        null // User ID should be resolved from CreatedBy
                    );
                    _context.AuditLogs.Add(auditLog);

                    // Save changes
                    await _context.SaveChangesAsync(cancellationToken);
                    await transaction.CommitAsync(cancellationToken);

                    _logger.LogInformation(
                        "Created equipment {SerialNumber} of type {Type}",
                        equipment.SerialNumber,
                        equipment.Type);

                    return equipment.Id;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    _logger.LogError(ex, "Error creating equipment {SerialNumber}", command.SerialNumber);
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing CreateEquipmentCommand");
                throw;
            }
        }
    }
}
