using System;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation; // v11.0.0
using MediatR; // v11.0.0
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Inspectors;
using ServiceProvider.Core.Domain.Audit;
using System.Text.Json;

namespace ServiceProvider.Services.Inspectors.Commands
{
    /// <summary>
    /// Command for mobilizing an inspector with comprehensive validation and audit tracking
    /// </summary>
    public class MobilizeInspectorCommand : IRequest<Unit>
    {
        public int InspectorId { get; }
        public int RequestingUserId { get; }
        public string Notes { get; }
        public DateTime MobilizationDate { get; }

        public MobilizeInspectorCommand(int inspectorId, int requestingUserId, string notes, DateTime? mobilizationDate = null)
        {
            if (inspectorId <= 0)
                throw new ArgumentException("Inspector ID must be greater than 0.", nameof(inspectorId));

            if (requestingUserId <= 0)
                throw new ArgumentException("Requesting user ID must be greater than 0.", nameof(requestingUserId));

            InspectorId = inspectorId;
            RequestingUserId = requestingUserId;
            Notes = notes?.Trim();
            MobilizationDate = mobilizationDate?.ToUniversalTime() ?? DateTime.UtcNow;
        }
    }

    /// <summary>
    /// Validator for MobilizeInspectorCommand implementing comprehensive business rules
    /// </summary>
    public class MobilizeInspectorCommandValidator : AbstractValidator<MobilizeInspectorCommand>
    {
        private readonly IApplicationDbContext _context;

        public MobilizeInspectorCommandValidator(IApplicationDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));

            RuleFor(x => x.InspectorId)
                .GreaterThan(0)
                .WithMessage("Inspector ID must be greater than 0.");

            RuleFor(x => x.RequestingUserId)
                .GreaterThan(0)
                .WithMessage("Requesting user ID must be greater than 0.");

            RuleFor(x => x.Notes)
                .MaximumLength(500)
                .WithMessage("Notes cannot exceed 500 characters.");

            RuleFor(x => x.MobilizationDate)
                .Must(date => date <= DateTime.UtcNow.AddDays(30))
                .WithMessage("Mobilization date cannot be more than 30 days in the future.")
                .Must(date => date >= DateTime.UtcNow.AddDays(-1))
                .WithMessage("Mobilization date cannot be in the past.");

            RuleFor(x => x)
                .MustAsync(ValidateInspectorExistsAsync)
                .WithMessage("Inspector not found.")
                .MustAsync(ValidateInspectorStatusAsync)
                .WithMessage("Inspector must be in Available status to be mobilized.")
                .MustAsync(ValidateDrugTestComplianceAsync)
                .WithMessage("Inspector must have a valid drug test within the last 90 days.");
        }

        private async Task<bool> ValidateInspectorExistsAsync(MobilizeInspectorCommand command, CancellationToken cancellationToken)
        {
            return await _context.Inspectors.AnyAsync(i => i.Id == command.InspectorId, cancellationToken);
        }

        private async Task<bool> ValidateInspectorStatusAsync(MobilizeInspectorCommand command, CancellationToken cancellationToken)
        {
            var inspector = await _context.Inspectors
                .FirstOrDefaultAsync(i => i.Id == command.InspectorId, cancellationToken);
            return inspector?.Status == InspectorStatus.Available;
        }

        private async Task<bool> ValidateDrugTestComplianceAsync(MobilizeInspectorCommand command, CancellationToken cancellationToken)
        {
            var inspector = await _context.Inspectors
                .Include(i => i.DrugTests)
                .FirstOrDefaultAsync(i => i.Id == command.InspectorId, cancellationToken);

            if (inspector == null) return false;

            var latestDrugTest = inspector.DrugTests
                .OrderByDescending(dt => dt.TestDate)
                .FirstOrDefault();

            return latestDrugTest != null &&
                   latestDrugTest.TestDate >= DateTime.UtcNow.AddDays(-90) &&
                   latestDrugTest.Result == true;
        }
    }

    /// <summary>
    /// Handler for MobilizeInspectorCommand implementing the complete mobilization workflow
    /// </summary>
    public class MobilizeInspectorCommandHandler : IRequestHandler<MobilizeInspectorCommand, Unit>
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<MobilizeInspectorCommandHandler> _logger;

        public MobilizeInspectorCommandHandler(
            IApplicationDbContext context,
            ILogger<MobilizeInspectorCommandHandler> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<Unit> Handle(MobilizeInspectorCommand request, CancellationToken cancellationToken)
        {
            _logger.LogInformation("Starting inspector mobilization process for Inspector ID: {InspectorId}", request.InspectorId);

            using var transaction = await _context.BeginTransactionAsync(cancellationToken);
            try
            {
                var inspector = await _context.Inspectors
                    .Include(i => i.DrugTests)
                    .FirstOrDefaultAsync(i => i.Id == request.InspectorId, cancellationToken);

                if (inspector == null)
                {
                    throw new InvalidOperationException($"Inspector with ID {request.InspectorId} not found.");
                }

                if (inspector.Status != InspectorStatus.Available)
                {
                    throw new InvalidOperationException("Inspector must be in Available status to be mobilized.");
                }

                // Perform mobilization
                inspector.Mobilize();

                // Create audit log
                var auditLog = new AuditLog(
                    entityName: "Inspector",
                    entityId: inspector.Id.ToString(),
                    action: "Update",
                    changes: JsonSerializer.Serialize(new
                    {
                        PreviousStatus = InspectorStatus.Available.ToString(),
                        NewStatus = InspectorStatus.Mobilized.ToString(),
                        MobilizationDate = request.MobilizationDate,
                        Notes = request.Notes
                    }),
                    ipAddress: "::1", // Should be obtained from the actual request context
                    userId: request.RequestingUserId
                );

                _context.AuditLogs.Add(auditLog);

                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                _logger.LogInformation("Successfully mobilized Inspector ID: {InspectorId}", request.InspectorId);

                return Unit.Value;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error mobilizing Inspector ID: {InspectorId}", request.InspectorId);
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }
}
