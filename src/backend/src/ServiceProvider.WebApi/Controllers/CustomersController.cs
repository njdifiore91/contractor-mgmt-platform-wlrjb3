using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using MediatR;
using ServiceProvider.Services.Customers.Commands;
using ServiceProvider.Services.Customers.Queries;
using ServiceProvider.WebApi.Filters;

namespace ServiceProvider.WebApi.Controllers
{
    /// <summary>
    /// API controller for managing customer operations with comprehensive security and validation.
    /// </summary>
    [ApiController]
    [Route("api/v1/[controller]")]
    [Authorize]
    [ApiExceptionFilter]
    [ResponseCache(Duration = 60, VaryByQueryKeys = new[] { "*" })]
    public class CustomersController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ILogger<CustomersController> _logger;

        public CustomersController(
            IMediator mediator,
            ILogger<CustomersController> logger)
        {
            _mediator = mediator ?? throw new ArgumentNullException(nameof(mediator));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Searches for customers with pagination, filtering and caching support.
        /// </summary>
        /// <param name="searchTerm">Optional search term for filtering customers</param>
        /// <param name="region">Optional region filter</param>
        /// <param name="isActive">Optional active status filter</param>
        /// <param name="page">Page number (1-based)</param>
        /// <param name="pageSize">Number of items per page (1-100)</param>
        /// <returns>Paginated list of customers matching the criteria</returns>
        [HttpGet]
        [Authorize(Roles = "Admin,Operations,CustomerService")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<PagedResult<CustomerDto>>> GetCustomers(
            [FromQuery] string searchTerm = null,
            [FromQuery] string region = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            _logger.LogInformation(
                "Searching customers. SearchTerm: {SearchTerm}, Region: {Region}, IsActive: {IsActive}, Page: {Page}",
                searchTerm, region, isActive, page);

            var query = new SearchCustomersQuery(
                searchTerm,
                region,
                isActive,
                page,
                pageSize);

            var result = await _mediator.Send(query);

            // Add cache headers
            Response.Headers.Add("X-Total-Count", result.TotalCount.ToString());
            Response.Headers.Add("X-Page-Count", ((int)Math.Ceiling(result.TotalCount / (double)pageSize)).ToString());

            return Ok(result);
        }

        /// <summary>
        /// Retrieves a specific customer by ID with proper error handling.
        /// </summary>
        /// <param name="id">Customer ID</param>
        /// <returns>Customer details if found</returns>
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Operations,CustomerService")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<CustomerDto>> GetCustomerById(int id)
        {
            _logger.LogInformation("Retrieving customer with ID: {CustomerId}", id);

            var query = new GetCustomerByIdQuery(id);
            var result = await _mediator.Send(query);

            if (result == null)
            {
                return NotFound();
            }

            // Add ETag for concurrency control
            Response.Headers.Add("ETag", $"\"{result.Version}\"");

            return Ok(result);
        }

        /// <summary>
        /// Creates a new customer with comprehensive validation.
        /// </summary>
        /// <param name="command">Customer creation details</param>
        /// <returns>Created customer ID and location</returns>
        [HttpPost]
        [Authorize(Roles = "Admin,Operations")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<int>> CreateCustomer([FromBody] CreateCustomerCommand command)
        {
            _logger.LogInformation("Creating new customer with code: {CustomerCode}", command.Code);

            var result = await _mediator.Send(command);

            if (!result.IsSuccess)
            {
                return BadRequest(result.Error);
            }

            return CreatedAtAction(
                nameof(GetCustomerById),
                new { id = result.Value },
                result.Value);
        }

        /// <summary>
        /// Updates an existing customer with concurrency control.
        /// </summary>
        /// <param name="id">Customer ID</param>
        /// <param name="command">Customer update details</param>
        /// <returns>No content if successful</returns>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Operations")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> UpdateCustomer(
            int id,
            [FromBody] UpdateCustomerCommand command)
        {
            if (id != command.Id)
            {
                return BadRequest("ID mismatch between URL and body");
            }

            _logger.LogInformation("Updating customer with ID: {CustomerId}", id);

            try
            {
                await _mediator.Send(command);
                return NoContent();
            }
            catch (NotFoundException)
            {
                return NotFound();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict("The customer has been modified by another user");
            }
        }
    }

    /// <summary>
    /// Represents a paginated result set.
    /// </summary>
    public class PagedResult<T>
    {
        public IEnumerable<T> Items { get; set; }
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}