using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using MediatR;
using ServiceProvider.Services.Inspectors.Commands;
using ServiceProvider.Core.Domain.Inspectors;
using ServiceProvider.WebApi.Filters;
using System;
using System.Threading.Tasks;

namespace ServiceProvider.WebApi.Controllers
{
    /// <summary>
    /// API controller for managing drug test records with comprehensive security and compliance features.
    /// Implements endpoints for creating and retrieving drug test records with role-based access control.
    /// </summary>
    [ApiController]
    [Route("api/v1/[controller]")]
    [Authorize]
    [ServiceFilter(typeof(ApiExceptionFilter))]
    public class DrugTestsController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ILogger<DrugTestsController> _logger;

        /// <summary>
        /// Initializes a new instance of the DrugTestsController with required dependencies.
        /// </summary>
        /// <param name="mediator">Mediator instance for CQRS pattern implementation</param>
        /// <param name="logger">Logger for secure audit logging</param>
        /// <exception cref="ArgumentNullException">Thrown when required dependencies are null</exception>
        public DrugTestsController(
            IMediator mediator,
            ILogger<DrugTestsController> logger)
        {
            _mediator = mediator ?? throw new ArgumentNullException(nameof(mediator));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Creates a new drug test record with comprehensive validation and security checks.
        /// </summary>
        /// <param name="command">Drug test creation details</param>
        /// <returns>ID of the created drug test record</returns>
        /// <response code="201">Returns the ID of the created drug test</response>
        /// <response code="400">If the request is invalid</response>
        /// <response code="401">If the user is not authenticated</response>
        /// <response code="403">If the user lacks required permissions</response>
        [HttpPost]
        [Authorize(Policy = "DrugTestManagement")]
        [ProducesResponseType(typeof(int), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<int>> CreateDrugTest([FromBody] CreateDrugTestCommand command)
        {
            _logger.LogInformation(
                "Creating drug test for inspector {InspectorId}. Test type: {TestType}, Kit ID: {TestKitId}",
                command.InspectorId,
                command.TestType,
                command.TestKitId);

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid drug test creation request");
                return BadRequest(ModelState);
            }

            try
            {
                var drugTestId = await _mediator.Send(command);

                _logger.LogInformation(
                    "Successfully created drug test {DrugTestId} for inspector {InspectorId}",
                    drugTestId,
                    command.InspectorId);

                return CreatedAtAction(
                    nameof(GetDrugTest),
                    new { id = drugTestId },
                    drugTestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error creating drug test for inspector {InspectorId}",
                    command.InspectorId);
                throw;
            }
        }

        /// <summary>
        /// Retrieves a specific drug test record with security validation.
        /// </summary>
        /// <param name="id">ID of the drug test to retrieve</param>
        /// <returns>Drug test record if found and authorized</returns>
        /// <response code="200">Returns the requested drug test</response>
        /// <response code="404">If the drug test is not found</response>
        /// <response code="401">If the user is not authenticated</response>
        /// <response code="403">If the user lacks required permissions</response>
        [HttpGet("{id}")]
        [Authorize(Policy = "DrugTestView")]
        [ProducesResponseType(typeof(DrugTest), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<DrugTest>> GetDrugTest(int id)
        {
            _logger.LogInformation("Retrieving drug test {DrugTestId}", id);

            if (id <= 0)
            {
                _logger.LogWarning("Invalid drug test ID: {DrugTestId}", id);
                return BadRequest("Invalid drug test ID");
            }

            try
            {
                var query = new GetDrugTestQuery { Id = id };
                var drugTest = await _mediator.Send(query);

                if (drugTest == null)
                {
                    _logger.LogWarning("Drug test not found: {DrugTestId}", id);
                    return NotFound();
                }

                _logger.LogInformation(
                    "Successfully retrieved drug test {DrugTestId} for inspector {InspectorId}",
                    id,
                    drugTest.InspectorId);

                return Ok(drugTest);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error retrieving drug test {DrugTestId}",
                    id);
                throw;
            }
        }
    }
}