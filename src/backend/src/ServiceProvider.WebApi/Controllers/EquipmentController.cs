using System;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.RateLimiting;
using ServiceProvider.Services.Equipment.Commands;
using ServiceProvider.Core.Domain.Equipment;
using ServiceProvider.Core.Domain.Audit;
using System.Text.Json;

namespace ServiceProvider.WebApi.Controllers
{
    /// <summary>
    /// API controller for managing equipment operations with enhanced security and performance features
    /// </summary>
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v1/[controller]")]
    [Authorize(Roles = "Admin,Operations")]
    [EnableRateLimiting("standard")]
    public class EquipmentController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ILogger<EquipmentController> _logger;
        private readonly IEquipmentService _equipmentService;

        public EquipmentController(
            IMediator mediator,
            ILogger<EquipmentController> logger,
            IEquipmentService equipmentService)
        {
            _mediator = mediator ?? throw new ArgumentNullException(nameof(mediator));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _equipmentService = equipmentService ?? throw new ArgumentNullException(nameof(equipmentService));
        }

        /// <summary>
        /// Retrieves equipment by ID with caching and security validation
        /// </summary>
        /// <param name="id">Equipment identifier</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Equipment details or NotFound</returns>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(EquipmentDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ResponseCache(Duration = 60, VaryByQueryKeys = new[] { "id" })]
        public async Task<ActionResult<EquipmentDto>> GetById(int id, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Retrieving equipment with ID: {EquipmentId}", id);

                var query = new GetEquipmentByIdQuery(id);
                var result = await _mediator.Send(query, cancellationToken);

                if (result == null)
                {
                    _logger.LogWarning("Equipment with ID {EquipmentId} not found", id);
                    return NotFound();
                }

                await LogAuditEvent("Read", id);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving equipment with ID {EquipmentId}", id);
                throw;
            }
        }

        /// <summary>
        /// Creates new equipment with comprehensive validation
        /// </summary>
        /// <param name="command">Equipment creation details</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Created equipment ID</returns>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(int), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<int>> Create(
            [FromBody] CreateEquipmentCommand command,
            CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation(
                    "Creating equipment: {SerialNumber}, Model: {Model}",
                    command.SerialNumber,
                    command.Model);

                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Check for duplicate serial number
                var exists = await _equipmentService.SerialNumberExistsAsync(
                    command.SerialNumber,
                    cancellationToken);

                if (exists)
                {
                    return BadRequest($"Equipment with serial number {command.SerialNumber} already exists");
                }

                var equipmentId = await _mediator.Send(command, cancellationToken);

                await LogAuditEvent("Create", equipmentId);

                return CreatedAtAction(
                    nameof(GetById),
                    new { id = equipmentId },
                    equipmentId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating equipment: {SerialNumber}", command.SerialNumber);
                throw;
            }
        }

        /// <summary>
        /// Updates equipment assignment with validation
        /// </summary>
        /// <param name="id">Equipment identifier</param>
        /// <param name="command">Assignment details</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Success or error response</returns>
        [HttpPut("{id}/assign")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AssignEquipment(
            int id,
            [FromBody] AssignEquipmentCommand command,
            CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation(
                    "Assigning equipment {EquipmentId} to inspector {InspectorId}",
                    id,
                    command.InspectorId);

                if (id != command.EquipmentId)
                {
                    return BadRequest("ID mismatch");
                }

                var result = await _mediator.Send(command, cancellationToken);

                if (!result)
                {
                    return NotFound();
                }

                await LogAuditEvent("Update", id);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error assigning equipment {EquipmentId}", id);
                throw;
            }
        }

        /// <summary>
        /// Processes equipment return with validation
        /// </summary>
        /// <param name="id">Equipment identifier</param>
        /// <param name="command">Return details</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Success or error response</returns>
        [HttpPut("{id}/return")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ReturnEquipment(
            int id,
            [FromBody] ReturnEquipmentCommand command,
            CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Processing return for equipment {EquipmentId}", id);

                if (id != command.EquipmentId)
                {
                    return BadRequest("ID mismatch");
                }

                var result = await _mediator.Send(command, cancellationToken);

                if (!result)
                {
                    return NotFound();
                }

                await LogAuditEvent("Update", id);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing equipment return {EquipmentId}", id);
                throw;
            }
        }

        /// <summary>
        /// Logs equipment-related audit events
        /// </summary>
        private async Task LogAuditEvent(string action, int equipmentId)
        {
            var auditLog = new AuditLog(
                "Equipment",
                equipmentId.ToString(),
                action,
                JsonSerializer.Serialize(new { EquipmentId = equipmentId }),
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "0.0.0.0",
                User.Identity?.IsAuthenticated == true ? int.Parse(User.Identity.Name) : null);

            await _mediator.Send(new CreateAuditLogCommand(auditLog));
        }
    }
}