using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Customers;

namespace ServiceProvider.Services.Customers.Queries
{
    /// <summary>
    /// CQRS Query for retrieving a customer by their unique identifier.
    /// Implements proper validation and includes related contacts.
    /// </summary>
    public class GetCustomerByIdQuery : IRequest<Customer>
    {
        /// <summary>
        /// Gets the unique identifier of the customer to retrieve.
        /// </summary>
        public int Id { get; }

        /// <summary>
        /// Initializes a new instance of the GetCustomerByIdQuery with validation.
        /// </summary>
        /// <param name="id">The customer identifier to query.</param>
        /// <exception cref="ArgumentException">Thrown when id is less than or equal to 0.</exception>
        public GetCustomerByIdQuery(int id)
        {
            if (id <= 0)
            {
                throw new ArgumentException("Customer ID must be greater than zero.", nameof(id));
            }

            Id = id;
        }
    }

    /// <summary>
    /// Handler for processing GetCustomerByIdQuery requests with proper error handling
    /// and performance optimization through query tuning and caching considerations.
    /// </summary>
    public class GetCustomerByIdQueryHandler : IRequestHandler<GetCustomerByIdQuery, Customer>
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<GetCustomerByIdQueryHandler> _logger;

        /// <summary>
        /// Initializes a new instance of GetCustomerByIdQueryHandler with required dependencies.
        /// </summary>
        /// <param name="context">The database context for customer data access.</param>
        /// <param name="logger">Logger for tracking query execution and errors.</param>
        /// <exception cref="ArgumentNullException">Thrown when context or logger is null.</exception>
        public GetCustomerByIdQueryHandler(
            IApplicationDbContext context,
            ILogger<GetCustomerByIdQueryHandler> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Handles the GetCustomerByIdQuery request with comprehensive error handling
        /// and performance optimization through efficient querying.
        /// </summary>
        /// <param name="request">The query request containing the customer ID.</param>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        /// <returns>The requested customer with included contacts if found.</returns>
        /// <exception cref="ArgumentNullException">Thrown when request is null.</exception>
        /// <exception cref="InvalidOperationException">Thrown when customer is not found.</exception>
        public async Task<Customer> Handle(
            GetCustomerByIdQuery request,
            CancellationToken cancellationToken)
        {
            if (request == null)
            {
                throw new ArgumentNullException(nameof(request));
            }

            try
            {
                _logger.LogInformation(
                    "Retrieving customer with ID: {CustomerId}", request.Id);

                // Optimize query with no-tracking since this is a read-only operation
                var customer = await _context.Customers
                    .AsNoTracking()
                    .Include(c => c.Contacts)
                    .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

                if (customer == null)
                {
                    _logger.LogWarning(
                        "Customer with ID {CustomerId} was not found", request.Id);
                    throw new InvalidOperationException(
                        $"Customer with ID {request.Id} was not found.");
                }

                _logger.LogInformation(
                    "Successfully retrieved customer with ID: {CustomerId}", request.Id);

                return customer;
            }
            catch (Exception ex) when (ex is not InvalidOperationException)
            {
                _logger.LogError(ex,
                    "Error retrieving customer with ID: {CustomerId}", request.Id);
                throw;
            }
        }
    }
}