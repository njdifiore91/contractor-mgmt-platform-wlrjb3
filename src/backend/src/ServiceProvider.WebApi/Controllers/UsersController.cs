using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using ServiceProvider.Services.Users.Commands;
using ServiceProvider.Services.Users.Queries;
using System.ComponentModel.DataAnnotations;
using Asp.Versioning;
using ServiceProvider.Core.Abstractions;

namespace ServiceProvider.WebApi.Controllers
{
    /// <summary>
    /// API controller for managing user operations with comprehensive security and validation.
    /// </summary>
    [ApiController]
    [Route("api/v1/users")]
    [Authorize]
    [ApiVersion("1.0")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public class UsersController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ILogger<UsersController> _logger;
        private const int DEFAULT_PAGE_SIZE = 10;
        private const int MAX_PAGE_SIZE = 100;

        public UsersController(
            IMediator mediator,
            ILogger<UsersController> logger)
        {
            _mediator = mediator ?? throw new ArgumentNullException(nameof(mediator));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Retrieves a user by their unique identifier with security trimming.
        /// </summary>
        /// <param name="id">The user ID to retrieve</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>User details if found and authorized</returns>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ResponseCache(Duration = 60, VaryByHeader = "Authorization")]
        public async Task<ActionResult<UserDto>> GetById(
            [Range(1, int.MaxValue)] int id,
            CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation(
                    "Retrieving user with ID: {UserId}, CorrelationId: {CorrelationId}",
                    id,
                    HttpContext.TraceIdentifier);

                var query = new GetUserByIdQuery(id);
                var result = await _mediator.Send(query, cancellationToken);

                if (result == null)
                {
                    _logger.LogWarning("User not found with ID: {UserId}", id);
                    return NotFound();
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user with ID: {UserId}", id);
                throw;
            }
        }

        /// <summary>
        /// Searches for users with filtering, pagination and security trimming.
        /// </summary>
        /// <param name="searchTerm">Optional search term for filtering</param>
        /// <param name="isActive">Optional active status filter</param>
        /// <param name="pageNumber">Page number for pagination</param>
        /// <param name="pageSize">Page size for pagination</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Paginated collection of users matching criteria</returns>
        [HttpGet]
        [ProducesResponseType(typeof(SearchUsersResult), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ResponseCache(Duration = 30, VaryByQueryKeys = new[] { "searchTerm", "isActive", "pageNumber", "pageSize" })]
        public async Task<ActionResult<SearchUsersResult>> Search(
            [FromQuery] string searchTerm,
            [FromQuery] bool? isActive,
            [FromQuery][Range(1, int.MaxValue)] int pageNumber = 1,
            [FromQuery][Range(1, MAX_PAGE_SIZE)] int pageSize = DEFAULT_PAGE_SIZE,
            CancellationToken cancellationToken = default)
        {
            try
            {
                _logger.LogInformation(
                    "Searching users. SearchTerm: {SearchTerm}, IsActive: {IsActive}, Page: {Page}, PageSize: {PageSize}",
                    searchTerm ?? "null",
                    isActive,
                    pageNumber,
                    pageSize);

                var query = new SearchUsersQuery(
                    searchTerm: searchTerm,
                    isActive: isActive,
                    pageNumber: pageNumber,
                    pageSize: Math.Min(pageSize, MAX_PAGE_SIZE));

                var result = await _mediator.Send(query, cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching users");
                throw;
            }
        }

        /// <summary>
        /// Creates a new user with security validation and Azure AD B2C integration.
        /// </summary>
        /// <param name="command">User creation command</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>ID of created user with location header</returns>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(int), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<int>> Create(
            [FromBody] CreateUserCommand command,
            CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation(
                    "Creating new user. Email: {Email}, CorrelationId: {CorrelationId}",
                    command.Email,
                    HttpContext.TraceIdentifier);

                var userId = await _mediator.Send(command, cancellationToken);

                _logger.LogInformation(
                    "User created successfully. ID: {UserId}, Email: {Email}",
                    userId,
                    command.Email);

                return CreatedAtAction(
                    nameof(GetById),
                    new { id = userId },
                    userId);
            }
            catch (Exception ex) when (ex.Message.Contains("already exists"))
            {
                _logger.LogWarning(
                    "Conflict creating user. Email: {Email}, Error: {Error}",
                    command.Email,
                    ex.Message);
                return Conflict(new { error = "User with this email already exists" });
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error creating user. Email: {Email}",
                    command.Email);
                throw;
            }
        }

        /// <summary>
        /// Updates an existing user's profile with validation and audit logging.
        /// </summary>
        /// <param name="id">User ID to update</param>
        /// <param name="command">Update command</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>No content on success</returns>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult> Update(
            [Range(1, int.MaxValue)] int id,
            [FromBody] UpdateUserCommand command,
            CancellationToken cancellationToken)
        {
            try
            {
                if (id != command.Id)
                {
                    return BadRequest("ID mismatch between route and command");
                }

                _logger.LogInformation(
                    "Updating user. ID: {UserId}, CorrelationId: {CorrelationId}",
                    id,
                    HttpContext.TraceIdentifier);

                await _mediator.Send(command, cancellationToken);

                _logger.LogInformation("User updated successfully. ID: {UserId}", id);
                return NoContent();
            }
            catch (NotFoundException)
            {
                _logger.LogWarning("User not found for update. ID: {UserId}", id);
                return NotFound();
            }
            catch (ConcurrencyException)
            {
                _logger.LogWarning(
                    "Concurrency conflict updating user. ID: {UserId}",
                    id);
                return Conflict(new { error = "User was modified by another process" });
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating user. ID: {UserId}",
                    id);
                throw;
            }
        }
    }
}
