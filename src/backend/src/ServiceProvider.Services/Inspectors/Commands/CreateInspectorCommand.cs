using System;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation; // v11.0.0
using MediatR; // v11.0.0
using Microsoft.Extensions.Logging; // v6.0.0
using Microsoft.Spatial; // v7.12.2
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Inspectors;
using ServiceProvider.Core.Domain.Audit;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace ServiceProvider.Services.Inspectors.Commands
{
    /// <summary>
    /// Command for creating a new inspector with location support and comprehensive validation
    /// </summary>
    public class CreateInspectorCommand : IRequest<int>
    {
        public int UserId { get; }
        public string BadgeNumber { get; }
        public GeographyPoint Location { get; }

        public CreateInspectorCommand(int userId, string badgeNumber, GeographyPoint location)
        {
            UserId = userId;
            BadgeNumber = badgeNumber;
            Location = location;
        }
    }

    /// <summary>
    /// Validator for CreateInspectorCommand with enhanced validation rules
    /// </summary>
    public class CreateInspectorCommandValidator : AbstractValidator<CreateInspectorCommand>
    {
        private readonly IApplicationDbContext _context;

        public CreateInspectorCommandValidator(IApplicationDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));

            RuleFor(x => x.UserId)
                .GreaterThan(0)
                .WithMessage("User ID must be greater than 0.");

            RuleFor(x => x.BadgeNumber)
                .NotEmpty()
                .WithMessage("Badge number is required.")
                .MaximumLength(20)
                .WithMessage("Badge number cannot exceed 20 characters.")
                .Matches(@"^[A-Z0-9\-]+$")
                .WithMessage("Badge number must contain only uppercase letters, numbers, and hyphens.");

            RuleFor(x => x.Location)
                .NotNull()
                .WithMessage("Location is required.");

            RuleFor(x => x.Location.Latitude)
                .InclusiveBetween(-90.0, 90.0)
                .WithMessage("Latitude must be between -90 and 90 degrees.");

            RuleFor(x => x.Location.Longitude)
                .InclusiveBetween(-180.0, 180.0)
                .WithMessage("Longitude must be between -180 and 180 degrees.");

            RuleFor(x => x.UserId)
                .MustAsync(async (userId, cancellation) =>
                {
                    var user = await _context.Users.FindAsync(new object[] { userId }, cancellation);
                    return user != null && user.IsActive;
                })
                .WithMessage("User must exist and be active.");

            RuleFor(x => x.BadgeNumber)
                .MustAsync(async (badgeNumber, cancellation) =>
                {
                    return !await _context.Inspectors
                        .AnyAsync(i => i.BadgeNumber == badgeNumber, cancellation);
                })
                .WithMessage("Badge number must be unique.");
        }
    }

    /// <summary>
    /// Handler for processing CreateInspectorCommand with transaction and audit support
    /// </summary>
    public class CreateInspectorCommandHandler : IRequestHandler<CreateInspectorCommand, int>
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<CreateInspectorCommandHandler> _logger;

        public CreateInspectorCommandHandler(
            IApplicationDbContext context,
            ILogger<CreateInspectorCommandHandler> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<int> Handle(CreateInspectorCommand command, CancellationToken cancellationToken)
        {
            try
            {
                // Create new inspector with initial Inactive status
                var inspector = new Inspector(
                    command.UserId,
                    command.BadgeNumber,
                    command.Location);

                // Add to context and save changes within transaction
                await using var transaction = await _context.BeginTransactionAsync(cancellationToken);
                try
                {
                    _context.Inspectors.Add(inspector);
                    await _context.SaveChangesAsync(cancellationToken);

                    // Create audit log entry
                    var auditLog = new AuditLog(
                        entityName: "Inspector",
                        entityId: inspector.Id.ToString(),
                        action: "Create",
                        changes: JsonSerializer.Serialize(new
                        {
                            UserId = inspector.UserId,
                            BadgeNumber = inspector.BadgeNumber,
                            //Location = new
                            //{
                            //    Latitude = inspector.Location.Latitude,
                            //    Longitude = inspector.Location.Longitude
                            //},
                            Status = inspector.Status
                        }),
                        ipAddress: "::1", // Should be injected from HTTP context in real implementation
                        userId: command.UserId
                    );

                    _context.AuditLogs.Add(auditLog);
                    await _context.SaveChangesAsync(cancellationToken);

                    await transaction.CommitAsync(cancellationToken);

                    _logger.LogInformation(
                        "Created new inspector with ID {InspectorId} for user {UserId}",
                        inspector.Id,
                        inspector.UserId);

                    return inspector.Id;
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error creating inspector for user {UserId}: {ErrorMessage}",
                    command.UserId,
                    ex.Message);
                throw;
            }
        }
    }
}
