using System;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation; // v11.0.0
using MediatR; // v11.0.0
using Microsoft.Extensions.Logging; // v6.0.0
using ServiceProvider.Core.Domain.Inspectors;
using ServiceProvider.Infrastructure.Data.Repositories;

namespace ServiceProvider.Services.Inspectors.Queries
{
    /// <summary>
    /// CQRS query request for retrieving a single inspector by ID with related data.
    /// </summary>
    public class GetInspectorByIdQuery : IRequest<Inspector>
    {
        /// <summary>
        /// Gets the unique identifier of the inspector to retrieve.
        /// </summary>
        public int Id { get; }

        /// <summary>
        /// Initializes a new instance of the GetInspectorByIdQuery with validation.
        /// </summary>
        /// <param name="id">The inspector ID to retrieve</param>
        /// <exception cref="ArgumentException">Thrown when ID is invalid</exception>
        public GetInspectorByIdQuery(int id)
        {
            if (id <= 0)
                throw new ArgumentException("Inspector ID must be greater than 0.", nameof(id));

            Id = id;
        }
    }

    /// <summary>
    /// Validator for GetInspectorByIdQuery requests.
    /// </summary>
    public class GetInspectorByIdQueryValidator : AbstractValidator<GetInspectorByIdQuery>
    {
        public GetInspectorByIdQueryValidator()
        {
            RuleFor(x => x.Id)
                .NotEmpty()
                .WithMessage("Inspector ID is required.")
                .GreaterThan(0)
                .WithMessage("Inspector ID must be greater than 0.");
        }
    }

    /// <summary>
    /// Handler for processing GetInspectorByIdQuery requests with comprehensive validation,
    /// security controls, and error handling.
    /// </summary>
    public class GetInspectorByIdQueryHandler : IRequestHandler<GetInspectorByIdQuery, Inspector>
    {
        private readonly InspectorRepository _inspectorRepository;
        private readonly ILogger<GetInspectorByIdQueryHandler> _logger;
        private readonly IValidator<GetInspectorByIdQuery> _validator;

        /// <summary>
        /// Initializes a new instance of GetInspectorByIdQueryHandler with required dependencies.
        /// </summary>
        /// <param name="inspectorRepository">Repository for inspector data access</param>
        /// <param name="logger">Logger for audit and error tracking</param>
        /// <param name="validator">Validator for query requests</param>
        /// <exception cref="ArgumentNullException">Thrown when any dependency is null</exception>
        public GetInspectorByIdQueryHandler(
            InspectorRepository inspectorRepository,
            ILogger<GetInspectorByIdQueryHandler> logger,
            IValidator<GetInspectorByIdQuery> validator)
        {
            _inspectorRepository = inspectorRepository ?? throw new ArgumentNullException(nameof(inspectorRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        }

        /// <summary>
        /// Handles the GetInspectorByIdQuery request with validation and error handling.
        /// </summary>
        /// <param name="request">The query request</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Inspector entity if found, null if not found</returns>
        /// <exception cref="ArgumentNullException">Thrown when request is null</exception>
        /// <exception cref="ValidationException">Thrown when request validation fails</exception>
        /// <exception cref="OperationCanceledException">Thrown when operation is canceled</exception>
        public async Task<Inspector> Handle(GetInspectorByIdQuery request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Processing GetInspectorById request for ID: {InspectorId}", request.Id);

                if (request == null)
                    throw new ArgumentNullException(nameof(request));

                // Validate request
                var validationResult = await _validator.ValidateAsync(request, cancellationToken);
                if (!validationResult.IsValid)
                {
                    var errors = string.Join(", ", validationResult.Errors);
                    _logger.LogWarning("Validation failed for GetInspectorById request. Errors: {Errors}", errors);
                    throw new ValidationException(validationResult.Errors);
                }

                // Check cancellation
                cancellationToken.ThrowIfCancellationRequested();

                // Retrieve inspector with related data
                var inspector = await _inspectorRepository.GetByIdAsync(request.Id);

                if (inspector == null)
                {
                    _logger.LogInformation("Inspector not found for ID: {InspectorId}", request.Id);
                    return null;
                }

                _logger.LogInformation("Successfully retrieved inspector with ID: {InspectorId}", request.Id);
                return inspector;
            }
            catch (Exception ex) when (ex is not ValidationException && ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Error retrieving inspector with ID: {InspectorId}", request.Id);
                throw;
            }
        }
    }
}