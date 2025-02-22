using System;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Users;
using ServiceProvider.Core.Domain.Audit;
using System.Text.Json;

namespace ServiceProvider.Services.Users.Commands
{
    /// <summary>
    /// Command for updating user profile information with enhanced validation and security
    /// </summary>
    public class UpdateUserCommand : IRequest<Unit>
    {
        public int Id { get; }
        public string FirstName { get; }
        public string LastName { get; }
        public string PhoneNumber { get; }
        public string ConcurrencyToken { get; }

        public UpdateUserCommand(
            int id,
            string firstName,
            string lastName,
            string phoneNumber,
            string concurrencyToken)
        {
            Id = id;
            FirstName = firstName?.Trim();
            LastName = lastName?.Trim();
            PhoneNumber = phoneNumber?.Trim();
            ConcurrencyToken = concurrencyToken;
        }
    }

    /// <summary>
    /// Validator for UpdateUserCommand with comprehensive validation rules
    /// </summary>
    public class UpdateUserCommandValidator : AbstractValidator<UpdateUserCommand>
    {
        public UpdateUserCommandValidator()
        {
            RuleFor(x => x.Id)
                .GreaterThan(0)
                .WithMessage("User ID must be greater than 0.");

            RuleFor(x => x.FirstName)
                .NotEmpty()
                .WithMessage("First name is required.")
                .MaximumLength(50)
                .WithMessage("First name cannot exceed 50 characters.")
                .Matches(@"^[a-zA-Z\s-']{2,50}$")
                .WithMessage("First name contains invalid characters.");

            RuleFor(x => x.LastName)
                .NotEmpty()
                .WithMessage("Last name is required.")
                .MaximumLength(50)
                .WithMessage("Last name cannot exceed 50 characters.")
                .Matches(@"^[a-zA-Z\s-']{2,50}$")
                .WithMessage("Last name contains invalid characters.");

            RuleFor(x => x.PhoneNumber)
                .Matches(@"^\+[1-9]\d{1,14}$")
                .When(x => !string.IsNullOrEmpty(x.PhoneNumber))
                .WithMessage("Phone number must be in E.164 format.");

            RuleFor(x => x.ConcurrencyToken)
                .NotEmpty()
                .WithMessage("Concurrency token is required.");
        }
    }

    /// <summary>
    /// Handler for UpdateUserCommand with enhanced security, validation and audit logging
    /// </summary>
    public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, Unit>
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<UpdateUserCommandHandler> _logger;

        public UpdateUserCommandHandler(
            IApplicationDbContext context,
            ILogger<UpdateUserCommandHandler> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<Unit> Handle(UpdateUserCommand command, CancellationToken cancellationToken)
        {
            try
            {
                // Begin transaction for atomic update
                using var transaction = await _context.BeginTransactionAsync(cancellationToken);

                // Retrieve user with concurrency check
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == command.Id, cancellationToken);

                if (user == null)
                {
                    throw new NotFoundException($"User with ID {command.Id} not found.");
                }

                // Capture original state for audit
                var originalState = JsonSerializer.Serialize(new
                {
                    user.FirstName,
                    user.LastName,
                    user.PhoneNumber
                });

                // Update user profile with validation
                user.UpdateProfile(
                    command.FirstName,
                    command.LastName,
                    command.PhoneNumber);

                // Create audit log entry
                var auditLog = new AuditLog(
                    entityName: "User",
                    entityId: user.Id.ToString(),
                    action: "Update",
                    changes: JsonSerializer.Serialize(new
                    {
                        OriginalState = originalState,
                        NewState = new
                        {
                            user.FirstName,
                            user.LastName,
                            user.PhoneNumber
                        }
                    }),
                    ipAddress: "::1", // Should be injected from HTTP context
                    userId: user.Id
                );

                _context.AuditLogs.Add(auditLog);

                // Save changes with concurrency check
                try
                {
                    await _context.SaveChangesAsync(cancellationToken);
                    await transaction.CommitAsync(cancellationToken);

                    _logger.LogInformation(
                        "User {UserId} profile updated successfully at {Timestamp}",
                        user.Id,
                        DateTime.UtcNow);

                    return Unit.Value;
                }
                catch (DbUpdateConcurrencyException)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    throw new ConcurrencyException("User profile was modified by another process.");
                }
            }
            catch (Exception ex) when (ex is not NotFoundException && ex is not ConcurrencyException)
            {
                _logger.LogError(
                    ex,
                    "Error updating user {UserId} profile: {ErrorMessage}",
                    command.Id,
                    ex.Message);
                throw;
            }
        }
    }

    /// <summary>
    /// Custom exception for handling not found scenarios
    /// </summary>
    public class NotFoundException : Exception
    {
        public NotFoundException(string message) : base(message) { }
    }

    /// <summary>
    /// Custom exception for handling concurrency conflicts
    /// </summary>
    public class ConcurrencyException : Exception
    {
        public ConcurrencyException(string message) : base(message) { }
    }
}