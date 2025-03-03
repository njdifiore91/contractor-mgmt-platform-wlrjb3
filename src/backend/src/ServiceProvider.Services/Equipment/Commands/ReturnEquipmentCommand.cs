using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Audit;
using ServiceProvider.Core.Domain.Equipment;
using ServiceProvider.Infrastructure.Data.Repositories;

namespace ServiceProvider.Services.Equipment.Commands
{
    /// <summary>
    /// Command for processing equipment return from an inspector with enhanced validation and audit support
    /// </summary>
    public class ReturnEquipmentCommand : IRequest<Result<bool>>
    {
        public int EquipmentId { get; }
        public string Condition { get; }
        public string Notes { get; }
        public DateTime ReturnDate { get; }
        public int ReturnedById { get; }
        public Dictionary<string, string> AuditMetadata { get; }

        public ReturnEquipmentCommand(
            int equipmentId,
            string condition,
            string notes,
            DateTime returnDate,
            int returnedById,
            Dictionary<string, string> auditMetadata)
        {
            if (equipmentId <= 0)
                throw new ArgumentException("Equipment ID must be greater than zero.", nameof(equipmentId));

            if (string.IsNullOrWhiteSpace(condition))
                throw new ArgumentException("Condition must be specified.", nameof(condition));

            if (returnDate == default)
                throw new ArgumentException("Return date must be specified.", nameof(returnDate));

            if (returnedById <= 0)
                throw new ArgumentException("Returned by ID must be greater than zero.", nameof(returnedById));

            EquipmentId = equipmentId;
            Condition = condition.Trim();
            Notes = notes?.Trim();
            ReturnDate = returnDate.ToUniversalTime();
            ReturnedById = returnedById;
            AuditMetadata = auditMetadata ?? new Dictionary<string, string>();
        }
    }

    /// <summary>
    /// Enhanced validator for ReturnEquipmentCommand with comprehensive validation rules
    /// </summary>
    public class ReturnEquipmentCommandValidator : AbstractValidator<ReturnEquipmentCommand>
    {
        private readonly IEquipmentRepository _equipmentRepository;

        public ReturnEquipmentCommandValidator(IEquipmentRepository equipmentRepository)
        {
            _equipmentRepository = equipmentRepository ?? throw new ArgumentNullException(nameof(equipmentRepository));

            RuleFor(x => x.EquipmentId)
                .GreaterThan(0)
                .WithMessage("Equipment ID must be greater than zero.");

            RuleFor(x => x.Condition)
                .NotEmpty()
                .MaximumLength(500)
                .WithMessage("Condition must be specified and not exceed 500 characters.");

            RuleFor(x => x.Notes)
                .MaximumLength(1000)
                .When(x => !string.IsNullOrEmpty(x.Notes))
                .WithMessage("Notes cannot exceed 1000 characters.");

            RuleFor(x => x.ReturnDate)
                .LessThanOrEqualTo(DateTime.UtcNow)
                .WithMessage("Return date cannot be in the future.");

            //RuleFor(x => x.ReturnedById)
            //    .NotEmpty()
            //    .Matches(@"^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$")
            //    .WithMessage("Invalid returned by ID format.");

            RuleFor(x => x.AuditMetadata)
                .Must(x => x.ContainsKey("UserAgent"))
                .WithMessage("Audit metadata must contain UserAgent information.");

            RuleFor(x => x)
                .MustAsync(ValidateEquipmentAssignmentAsync)
                .WithMessage("Equipment is not currently assigned or already returned.");
        }

        private async Task<bool> ValidateEquipmentAssignmentAsync(ReturnEquipmentCommand command, CancellationToken cancellationToken)
        {
            var equipment = await _equipmentRepository.GetByIdAsync(command.EquipmentId, cancellationToken);
            return equipment != null && !equipment.IsAvailable;
        }
    }

    /// <summary>
    /// Handler for processing ReturnEquipmentCommand with enhanced error handling and audit support
    /// </summary>
    public class ReturnEquipmentCommandHandler : IRequestHandler<ReturnEquipmentCommand, Result<bool>>
    {
        private readonly IEquipmentRepository _equipmentRepository;
        private readonly ILogger<ReturnEquipmentCommandHandler> _logger;
        private readonly IAuditTrailService _auditService;

        public ReturnEquipmentCommandHandler(
            IEquipmentRepository equipmentRepository,
            ILogger<ReturnEquipmentCommandHandler> logger,
            IAuditTrailService auditService)
        {
            _equipmentRepository = equipmentRepository ?? throw new ArgumentNullException(nameof(equipmentRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _auditService = auditService ?? throw new ArgumentNullException(nameof(auditService));
        }

        public async Task<Result<bool>> Handle(ReturnEquipmentCommand command, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation(
                    "Processing equipment return for Equipment ID: {EquipmentId}, Returned By: {ReturnedById}",
                    command.EquipmentId,
                    command.ReturnedById);

                var validator = new ReturnEquipmentCommandValidator(_equipmentRepository);
                var validationResult = await validator.ValidateAsync(command, cancellationToken);

                if (!validationResult.IsValid)
                {
                    _logger.LogWarning(
                        "Validation failed for equipment return. Equipment ID: {EquipmentId}, Errors: {Errors}",
                        command.EquipmentId,
                        string.Join(", ", validationResult.Errors));

                    return Result<bool>.Failure(validationResult.Errors[0].ErrorMessage);
                }

                await using var transaction = await _equipmentRepository.BeginTransactionAsync(cancellationToken);

                try
                {
                    await _equipmentRepository.ProcessReturnAsync(
                        command.EquipmentId,
                        command.Condition,
                        command.Notes,
                        cancellationToken);

                    var auditEntry = new AuditLog(
                        "Equipment",
                        command.EquipmentId.ToString(),
                        "Return",
                        System.Text.Json.JsonSerializer.Serialize(new
                        {
                            command.Condition,
                            command.Notes,
                            command.ReturnDate,
                            command.ReturnedById
                        }),
                        command.AuditMetadata["IpAddress"], command.ReturnedById);

                    await _auditService.LogAsync(auditEntry, cancellationToken);

                    // Persist the audit log entry
                    await transaction.CommitAsync(cancellationToken);

                    _logger.LogInformation(
                        "Successfully processed equipment return for Equipment ID: {EquipmentId}",
                        command.EquipmentId);

                    return Result<bool>.Success(true);
                }
                catch (Exception ex)
                {
                    //await transaction.RollbackAsync(cancellationToken);
                    throw new ApplicationException("Failed to process equipment return.", ex);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error processing equipment return for Equipment ID: {EquipmentId}",
                    command.EquipmentId);

                return Result<bool>.Failure($"Failed to process equipment return: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Result wrapper for command operations
    /// </summary>
    public class Result<T>
    {
        public bool IsSuccess { get; }
        public T Value { get; }
        public string Error { get; }

        private Result(bool isSuccess, T value, string error)
        {
            IsSuccess = isSuccess;
            Value = value;
            Error = error;
        }

        public static Result<T> Success(T value) => new Result<T>(true, value, null);
        public static Result<T> Failure(string error) => new Result<T>(false, default, error);
    }
}
