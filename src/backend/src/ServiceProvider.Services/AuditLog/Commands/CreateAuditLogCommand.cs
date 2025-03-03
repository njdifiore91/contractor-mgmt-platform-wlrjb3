//using System;
//using System.Threading;
//using System.Threading.Tasks;
//using FluentValidation;
//using MediatR;
//using Microsoft.Extensions.Logging;
//using ServiceProvider.Core.Abstractions;
//using ServiceProvider.Core.Domain.Customers;
//using ServiceProvider.Infrastructure.Data.Repositories;
//using ServiceProvider.Core.Domain.Audit;

//namespace ServiceProvider.Services.Customers.Commands
//{
//    /// <summary>
//    /// Command for creating a new customer with comprehensive validation and audit support.
//    /// </summary>
//    public class CreateAuditLogCommand : IRequest<Result<int>>
//    {
//        public CreateAuditLogCommand(AuditLog auditLog)
//        {
            
//        }

//    }

//    /// <summary>
//    /// Validator for the CreateCustomerCommand with comprehensive business rules.
//    /// </summary>
//    public class CreateAuditLogCommandValidator : AbstractValidator<CreateAuditLogCommand>
//    {
//        private readonly ICustomerRepository _customerRepository;
//        private readonly ILogger<CreateAuditLogCommandValidator> _logger;

//        public CreateAuditLogCommandValidator(
//            ICustomerRepository customerRepository,
//            ILogger<CreateAuditLogCommandValidator> logger)
//        {
//            _customerRepository = customerRepository ?? throw new ArgumentNullException(nameof(customerRepository));
//            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

//            //RuleFor(x => x.Code)
//            //    .NotEmpty().WithMessage("Customer code is required.")
//            //    .Matches(@"^[A-Z]{3}-\d{3}$").WithMessage("Code must be in format XXX-000.")
//            //    .MustAsync(async (code, cancellation) =>
//            //    {
//            //        var existing = await _customerRepository.GetByCodeAsync(code);
//            //        return existing == null;
//            //    }).WithMessage("Customer code must be unique.");

//            //RuleFor(x => x.Name)
//            //    .NotEmpty().WithMessage("Customer name is required.")
//            //    .MaximumLength(100).WithMessage("Name cannot exceed 100 characters.")
//            //    .Must(name => !string.IsNullOrWhiteSpace(name)).WithMessage("Name cannot be whitespace.");

//            //RuleFor(x => x.Industry)
//            //    .NotEmpty().WithMessage("Industry is required.")
//            //    .MustAsync(async (industry, cancellation) =>
//            //    {
//            //        return await _customerRepository.ValidateIndustryCodeAsync(industry);
//            //    }).WithMessage("Invalid industry code.");

//            //RuleFor(x => x.Region)
//            //    .NotEmpty().WithMessage("Region is required.");

//            //RuleFor(x => x.Address)
//            //    .MaximumLength(200).WithMessage("Address cannot exceed 200 characters.")
//            //    .When(x => !string.IsNullOrWhiteSpace(x.Address));

//            //RuleFor(x => x.City)
//            //    .MaximumLength(100).WithMessage("City cannot exceed 100 characters.")
//            //    .When(x => !string.IsNullOrWhiteSpace(x.City));

//            //RuleFor(x => x.State)
//            //    .MaximumLength(50).WithMessage("State cannot exceed 50 characters.")
//            //    .When(x => !string.IsNullOrWhiteSpace(x.State));

//            //RuleFor(x => x.PostalCode)
//            //    .MaximumLength(20).WithMessage("Postal code cannot exceed 20 characters.")
//            //    .When(x => !string.IsNullOrWhiteSpace(x.PostalCode));

//            //RuleFor(x => x.Country)
//            //    .MaximumLength(2).WithMessage("Country must be ISO 3166-1 alpha-2 code.")
//            //    .When(x => !string.IsNullOrWhiteSpace(x.Country));

//            //RuleFor(x => x.CreatedBy)
//            //    .NotEmpty().WithMessage("Creator identifier is required.");

//            //RuleFor(x => x.CreatedAt)
//            //    .NotEmpty().WithMessage("Creation timestamp is required.")
//            //    .Must(date => date.Kind == DateTimeKind.Utc).WithMessage("Timestamp must be UTC.")
//            //    .LessThanOrEqualTo(DateTime.UtcNow).WithMessage("Creation date cannot be in the future.");
//        }
//    }

//    /// <summary>
//    /// Handler for processing customer creation with security and audit trail.
//    /// </summary>
//    public class CreateAuditLogCommandHandler : IRequestHandler<CreateAuditLogCommand, Result<int>>
//    {
//        private readonly ICustomerRepository _customerRepository;
//        private readonly IAuditService _auditService;
//        private readonly ILogger<CreateCustomerCommandHandler> _logger;

//        public CreateAuditLogCommandHandler(
//            ICustomerRepository customerRepository,
//            IAuditService auditService,
//            ILogger<CreateCustomerCommandHandler> logger)
//        {
//            _customerRepository = customerRepository ?? throw new ArgumentNullException(nameof(customerRepository));
//            _auditService = auditService ?? throw new ArgumentNullException(nameof(auditService));
//            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
//        }

//        public async Task<Result<int>> Handle(CreateAuditLogCommand command, CancellationToken cancellationToken)
//        {
//            try
//            {
//                _logger.LogInformation("Creating new customer with code: {CustomerCode}", command.Code);

//                var customer = new Au(
//                    command.Code,
//                    command.Name,
//                    command.Industry,
//                    command.Region
//                );

//                customer.UpdateDetails(
//                    command.Name,
//                    command.Industry,
//                    command.Region,
//                    command.Address,
//                    command.City,
//                    command.State,
//                    command.PostalCode,
//                    command.Country
//                );

//                var createdCustomer = await _customerRepository.AddAsync(customer);

//                await _auditService.LogAsync(new AuditLog(
//                    entityName: "Customer",
//                    entityId: createdCustomer.Id.ToString(),
//                    action: "Create",
//                    changes: System.Text.Json.JsonSerializer.Serialize(new
//                    {
//                        Code = command.Code,
//                        Name = command.Name,
//                        Industry = command.Industry,
//                        Region = command.Region
//                    }),
//                    ipAddress: "127.0.0.1", // In production, get from IHttpContextAccessor
//                    userId: int.Parse(command.CreatedBy)
//                ));

//                _logger.LogInformation("Successfully created customer with ID: {CustomerId}", createdCustomer.Id);

//                return Result<int>.Success(createdCustomer.Id);
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error creating customer with code: {CustomerCode}", command.Code);
//                return Result<int>.Failure($"Failed to create customer: {ex.Message}");
//            }
//        }
//    }

//    //public class Result<T>
//    //{
//    //    public bool IsSuccess { get; private set; }
//    //    public T Value { get; private set; }
//    //    public string Error { get; private set; }

//    //    private Result(bool isSuccess, T value, string error)
//    //    {
//    //        IsSuccess = isSuccess;
//    //        Value = value;
//    //        Error = error;
//    //    }

//    //    public static Result<T> Success(T value) => new Result<T>(true, value, null);
//    //    public static Result<T> Failure(string error) => new Result<T>(false, default, error);
//    //}
//}
