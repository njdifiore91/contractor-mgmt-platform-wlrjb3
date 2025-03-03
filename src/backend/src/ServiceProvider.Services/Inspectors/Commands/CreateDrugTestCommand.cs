using System;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation; // v11.0.0
using MediatR; // v11.0.0
using Microsoft.Extensions.Logging;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Inspectors;
using ServiceProvider.Core.Domain.Audit;
using System.Text.Json;

namespace ServiceProvider.Services.Inspectors.Commands
{
    /// <summary>
    /// Command for creating a new drug test record with enhanced validation and security
    /// </summary>
    public class CreateDrugTestCommand : IRequest<int>
    {
        public int InspectorId { get; set; }
        public string TestType { get; set; }
        public string TestKitId { get; set; }
        public bool Result { get; set; }
        public string Notes { get; set; }
        public DateTime TestDate { get; set; }
        public string Location { get; set; }
        public string SupervisorId { get; set; }

        /// <summary>
        /// Validator for CreateDrugTestCommand with comprehensive business rules
        /// </summary>
        public class Validator : AbstractValidator<CreateDrugTestCommand>
        {
            public Validator()
            {
                RuleFor(x => x.InspectorId)
                    .GreaterThan(0)
                    .WithMessage("Inspector ID must be greater than 0");

                RuleFor(x => x.TestType)
                    .NotEmpty()
                    .WithMessage("Test type is required")
                    .Must(type => new[] { "Standard Panel", "DOT Panel", "Extended Panel" }.Contains(type))
                    .WithMessage("Invalid test type. Must be: Standard Panel, DOT Panel, or Extended Panel");

                RuleFor(x => x.TestKitId)
                    .NotEmpty()
                    .WithMessage("Test kit ID is required")
                    .Matches(@"^DT-\d{4}-\d{4}$")
                    .WithMessage("Test kit ID must be in format DT-YYYY-NNNN");

                RuleFor(x => x.Notes)
                    .MaximumLength(1000)
                    .WithMessage("Notes cannot exceed 1000 characters");

                RuleFor(x => x.TestDate)
                    .NotEmpty()
                    .WithMessage("Test date is required")
                    .LessThanOrEqualTo(DateTime.UtcNow)
                    .WithMessage("Test date cannot be in the future");

                RuleFor(x => x.Location)
                    .NotEmpty()
                    .WithMessage("Location is required")
                    .MaximumLength(200)
                    .WithMessage("Location cannot exceed 200 characters");

                RuleFor(x => x.SupervisorId)
                    .NotEmpty()
                    .WithMessage("Supervisor ID is required");
            }
        }

        /// <summary>
        /// Handler for processing CreateDrugTestCommand with enhanced security and audit trail
        /// </summary>
        public class Handler : IRequestHandler<CreateDrugTestCommand, int>
        {
            private readonly IApplicationDbContext _context;
            private readonly ICurrentUserService _currentUserService;
            private readonly ILogger<Handler> _logger;

            public Handler(
                IApplicationDbContext context,
                ICurrentUserService currentUserService,
                ILogger<Handler> logger)
            {
                _context = context ?? throw new ArgumentNullException(nameof(context));
                _currentUserService = currentUserService ?? throw new ArgumentNullException(nameof(currentUserService));
                _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            }

            public async Task<int> Handle(CreateDrugTestCommand command, CancellationToken cancellationToken)
            {
                try
                {
                    // Begin transaction for atomic operation
                    await using var transaction = await _context.BeginTransactionAsync(cancellationToken);

                    // Create new drug test with validated data
                    var drugTest = new DrugTest(
                        command.InspectorId,
                        command.TestType,
                        command.TestKitId,
                        _currentUserService.Email);

                    // Record test result and notes
                    drugTest.RecordResult(command.Result, command.Notes);

                    // Create audit log entry
                    var auditLog = new AuditLog(
                        entityName: "DrugTest",
                        entityId: drugTest.Id.ToString(),
                        action: "Create",
                        changes: JsonSerializer.Serialize(new
                        {
                            InspectorId = command.InspectorId,
                            TestType = command.TestType,
                            TestKitId = command.TestKitId,
                            Result = command.Result,
                            TestDate = command.TestDate,
                            Location = command.Location,
                            SupervisorId = command.SupervisorId
                        }),
                        ipAddress: "::1", // Should be obtained from request context in production
                        userId: _currentUserService.UserId);

                    // Add entities to context
                    _context.DrugTests.Add(drugTest);
                    _context.AuditLogs.Add(auditLog);

                    // Save changes and commit transaction
                    await _context.SaveChangesAsync(cancellationToken);
                    await transaction.CommitAsync(cancellationToken);

                    _logger.LogInformation(
                        "Drug test {TestKitId} created for inspector {InspectorId}",
                        command.TestKitId,
                        command.InspectorId);

                    return drugTest.Id;
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex,
                        "Error creating drug test {TestKitId} for inspector {InspectorId}",
                        command.TestKitId,
                        command.InspectorId);
                    throw;
                }
            }
        }
    }
}
