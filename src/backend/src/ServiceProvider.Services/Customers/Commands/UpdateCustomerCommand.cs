using System;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Customers;

namespace ServiceProvider.Services.Customers.Commands
{
    /// <summary>
    /// Command for updating customer details with comprehensive validation and concurrency control
    /// </summary>
    public class UpdateCustomerCommand : IRequest<Unit>
    {
        public int Id { get; }
        public string Name { get; }
        public string Industry { get; }
        public string Region { get; }
        public string Address { get; }
        public string City { get; }
        public string State { get; }
        public string PostalCode { get; }
        public string Country { get; }
        public byte[] RowVersion { get; }

        public UpdateCustomerCommand(
            int id,
            string name,
            string industry,
            string region,
            string address,
            string city,
            string state,
            string postalCode,
            string country,
            byte[] rowVersion)
        {
            Id = id;
            Name = name;
            Industry = industry;
            Region = region;
            Address = address;
            City = city;
            State = state;
            PostalCode = postalCode;
            Country = country;
            RowVersion = rowVersion ?? throw new ArgumentNullException(nameof(rowVersion));
        }
    }

    /// <summary>
    /// Handler for processing customer update commands with security and audit tracking
    /// </summary>
    public class UpdateCustomerCommandHandler : IRequestHandler<UpdateCustomerCommand, Unit>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public UpdateCustomerCommandHandler(
            IApplicationDbContext context,
            ICurrentUserService currentUserService)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _currentUserService = currentUserService ?? throw new ArgumentNullException(nameof(currentUserService));
        }

        public async Task<Unit> Handle(UpdateCustomerCommand command, CancellationToken cancellationToken)
        {
            // Verify user has required permissions
            if (!_currentUserService.IsInRole("Admin") && !_currentUserService.IsInRole("Operations"))
            {
                throw new UnauthorizedAccessException("User does not have permission to update customer details.");
            }

            // Begin transaction for atomic update
            using var transaction = await _context.BeginTransactionAsync(cancellationToken);

            try
            {
                // Retrieve customer with concurrency check
                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.Id == command.Id, cancellationToken);

                if (customer == null)
                {
                    throw new NotFoundException($"Customer with ID {command.Id} not found.");
                }

                // Verify concurrency token
                if (!customer.Version.SequenceEqual(command.RowVersion))
                {
                    throw new DbUpdateConcurrencyException("The customer has been modified by another user.");
                }

                // Update customer details with validation
                customer.UpdateDetails(
                    command.Name,
                    command.Industry,
                    command.Region,
                    command.Address,
                    command.City,
                    command.State,
                    command.PostalCode,
                    command.Country
                );

                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                return Unit.Value;
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }

    /// <summary>
    /// Validator for UpdateCustomerCommand with comprehensive business rules
    /// </summary>
    public class UpdateCustomerCommandValidator : AbstractValidator<UpdateCustomerCommand>
    {
        public UpdateCustomerCommandValidator()
        {
            RuleFor(x => x.Id)
                .GreaterThan(0)
                .WithMessage("Customer ID must be greater than 0.");

            RuleFor(x => x.Name)
                .NotEmpty()
                .MaximumLength(100)
                .WithMessage("Name must not be empty and cannot exceed 100 characters.");

            RuleFor(x => x.Industry)
                .NotEmpty()
                .WithMessage("Industry must not be empty.");

            RuleFor(x => x.Region)
                .NotEmpty()
                .WithMessage("Region must not be empty.");

            RuleFor(x => x.Address)
                .MaximumLength(200)
                .When(x => !string.IsNullOrEmpty(x.Address))
                .WithMessage("Address cannot exceed 200 characters.");

            RuleFor(x => x.City)
                .MaximumLength(100)
                .When(x => !string.IsNullOrEmpty(x.City))
                .WithMessage("City cannot exceed 100 characters.");

            RuleFor(x => x.State)
                .MaximumLength(50)
                .When(x => !string.IsNullOrEmpty(x.State))
                .WithMessage("State cannot exceed 50 characters.");

            RuleFor(x => x.PostalCode)
                .MaximumLength(20)
                .When(x => !string.IsNullOrEmpty(x.PostalCode))
                .WithMessage("Postal code cannot exceed 20 characters.");

            RuleFor(x => x.Country)
                .MaximumLength(2)
                .When(x => !string.IsNullOrEmpty(x.Country))
                .WithMessage("Country must be a valid 2-letter ISO code.");

            RuleFor(x => x.RowVersion)
                .NotNull()
                .WithMessage("Concurrency token is required.");
        }
    }

    /// <summary>
    /// Custom exception for when a requested entity is not found
    /// </summary>
    public class NotFoundException : Exception
    {
        public NotFoundException(string message) : base(message)
        {
        }
    }
}