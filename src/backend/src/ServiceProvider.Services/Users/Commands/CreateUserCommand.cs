using System;
using System.Threading;
using System.Threading.Tasks;
using System.Text.RegularExpressions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Users;

namespace ServiceProvider.Services.Users.Commands
{
    /// <summary>
    /// Command for creating a new user with enhanced security validation
    /// </summary>
    public class CreateUserCommand : IRequest<int>
    {
        public string Email { get; }
        public string FirstName { get; }
        public string LastName { get; }
        public string AzureAdB2CId { get; }
        public string Password { get; }
        public DateTime CreatedAt { get; }
        public string CreatedBy { get; }

        public CreateUserCommand(string email, string firstName, string lastName, string azureAdB2CId, string createdBy, string password)
        {
            // Sanitize and trim inputs
            Email = (email ?? string.Empty).Trim();
            FirstName = (firstName ?? string.Empty).Trim();
            LastName = (lastName ?? string.Empty).Trim();
            AzureAdB2CId = (azureAdB2CId ?? string.Empty).Trim();
            CreatedBy = (createdBy ?? string.Empty).Trim();
            CreatedAt = DateTime.UtcNow;
            Password = (password ?? string.Empty).Trim();
        }
    }

    /// <summary>
    /// Validator for CreateUserCommand with comprehensive validation rules
    /// </summary>
    public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
    {
        private static readonly Regex EmailPattern = new(
            @"^(?>[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|""(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*"")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$",
            RegexOptions.Compiled | RegexOptions.CultureInvariant);

        private static readonly Regex PasswordPattern = new(
            @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$",
            RegexOptions.Compiled);

        private static readonly Regex NamePattern = new(@"^[a-zA-Z\s-']{2,50}$", RegexOptions.Compiled);
        private static readonly Regex GuidPattern = new(@"^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$", RegexOptions.Compiled);

        public CreateUserCommandValidator()
        {
            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .MaximumLength(254).WithMessage("Email cannot exceed 254 characters.")
                .Must(email => EmailPattern.IsMatch(email)).WithMessage("Invalid email format.");

            RuleFor(x => x.FirstName)
                .NotEmpty().WithMessage("First name is required.")
                .Must(name => NamePattern.IsMatch(name)).WithMessage("First name must be 2-50 characters and contain only letters, spaces, hyphens and apostrophes.");

            RuleFor(x => x.LastName)
                .NotEmpty().WithMessage("Last name is required.")
                .Must(name => NamePattern.IsMatch(name)).WithMessage("Last name must be 2-50 characters and contain only letters, spaces, hyphens and apostrophes.");

            RuleFor(x => x.AzureAdB2CId)
                .NotEmpty().WithMessage("Azure AD B2C ID is required.")
                .Must(id => GuidPattern.IsMatch(id)).WithMessage("Invalid Azure AD B2C ID format.");

            RuleFor(x => x.CreatedBy)
                .NotEmpty().WithMessage("Created by is required.")
                .MaximumLength(100).WithMessage("Created by cannot exceed 100 characters.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required.")
                .Must(password => PasswordPattern.IsMatch(password)).WithMessage("Password must be 8+ characters; include lowercase, uppercase, digit, & one @$!%*?&.");
        }
    }

    /// <summary>
    /// Handler for processing user creation with enhanced security and audit
    /// </summary>
    public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, int>
    {
        private readonly IApplicationDbContext _dbContext;
        private readonly ILogger<CreateUserCommandHandler> _logger;

        public CreateUserCommandHandler(
            IApplicationDbContext dbContext,
            ILogger<CreateUserCommandHandler> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<int> Handle(CreateUserCommand command, CancellationToken cancellationToken)
        {
            try
            {
                // Check for existing user by email
                var existingUser = await _dbContext.Users
                    .FirstOrDefaultAsync(u => u.Email == command.Email, cancellationToken);

                if (existingUser != null)
                {
                    throw new InvalidOperationException($"User with email {command.Email} already exists.");
                }

                // Create new user with domain validation
                //var user = new User(
                //    id: 0,
                //    email: command.Email,
                //    firstName: command.FirstName,
                //    lastName: command.LastName,
                //    azureAdB2CId: command.AzureAdB2CId,
                //    password: command.Password);

                var user = new User(command.Email, command.FirstName, command.LastName, command.AzureAdB2CId);
                user.SetPassword(command.Password);

                // Add user to database
                _dbContext.Users.Add(user);
                await _dbContext.SaveChangesAsync(cancellationToken);

                _logger.LogInformation(
                    "User created successfully. ID: {UserId}, Email: {Email}, AzureAdB2CId: {AzureAdB2CId}",
                    user.Id,
                    user.Email,
                    user.AzureAdB2CId);

                return user.Id;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error creating user. Email: {Email}, AzureAdB2CId: {AzureAdB2CId}",
                    command.Email,
                    command.AzureAdB2CId);
                throw;
            }
        }
    }
}
