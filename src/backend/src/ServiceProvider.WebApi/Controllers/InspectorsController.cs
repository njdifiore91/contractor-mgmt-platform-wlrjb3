using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Asp.Versioning;
using MediatR; // v11.0.0
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory; // v6.0.0
using Microsoft.Extensions.Logging;
using Microsoft.Spatial; // v7.12.2
using ServiceProvider.Core.Domain.Inspectors;
using ServiceProvider.Services.Inspectors.Commands;
using ServiceProvider.Services.Inspectors.Queries;
using Swashbuckle.AspNetCore.Annotations; // v6.4.0

namespace ServiceProvider.WebApi.Controllers
{
    /// <summary>
    /// API controller for managing inspector-related operations including search, creation, and mobilization.
    /// Implements caching, validation, and comprehensive error handling.
    /// </summary>
    [ApiController]
    [Route("api/v1/[controller]")]
    [Authorize]
    [ApiVersion("1.0")]
    [Produces("application/json")]
    public class InspectorsController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IMemoryCache _cache;
        private readonly ILogger<InspectorsController> _logger;
        private const string CACHE_KEY_PREFIX = "Inspector_";
        private static readonly TimeSpan CACHE_DURATION = TimeSpan.FromMinutes(5);

        public InspectorsController(
            IMediator mediator,
            IMemoryCache cache,
            ILogger<InspectorsController> logger)
        {
            _mediator = mediator ?? throw new ArgumentNullException(nameof(mediator));
            _cache = cache ?? throw new ArgumentNullException(nameof(cache));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Searches for inspectors based on location and other criteria with caching support.
        /// </summary>
        /// <param name="latitude">Search center latitude</param>
        /// <param name="longitude">Search center longitude</param>
        /// <param name="radiusInMiles">Search radius in miles</param>
        /// <param name="status">Filter by inspector status</param>
        /// <param name="certifications">Required certifications</param>
        /// <param name="isActive">Filter by active status</param>
        /// <param name="pageNumber">Page number for pagination</param>
        /// <param name="pageSize">Items per page</param>
        /// <returns>Paginated list of inspectors matching search criteria</returns>
        [HttpGet("search")]
        [ProducesResponseType(typeof(PaginatedList<InspectorDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [SwaggerOperation(Summary = "Search inspectors by location and criteria", Tags = new[] { "Inspectors" })]
        public async Task<ActionResult<PaginatedList<InspectorDto>>> Search(
            [FromQuery] double latitude,
            [FromQuery] double longitude,
            [FromQuery] double radiusInMiles = 50,
            [FromQuery] InspectorStatus? status = null,
            [FromQuery] List<string> certifications = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var location = GeographyPoint.Create(latitude, longitude);
                var cacheKey = $"{CACHE_KEY_PREFIX}Search_{latitude}_{longitude}_{radiusInMiles}_{status}_{isActive}_{pageNumber}_{pageSize}_{string.Join(",", certifications ?? new List<string>())}";

                if (_cache.TryGetValue(cacheKey, out PaginatedList<InspectorDto> cachedResult))
                {
                    _logger.LogInformation("Returning cached search results for key: {CacheKey}", cacheKey);
                    return Ok(cachedResult);
                }

                var query = new SearchInspectorsQuery(location, radiusInMiles)
                {
                    Status = status,
                    RequiredCertifications = certifications,
                    IsActive = isActive,
                    PageNumber = pageNumber,
                    PageSize = pageSize
                };

                var result = await _mediator.Send(query);

                _cache.Set(cacheKey, result, CACHE_DURATION);

                _logger.LogInformation(
                    "Inspector search completed. Found {TotalCount} inspectors within {Radius} miles of ({Latitude}, {Longitude})",
                    result.TotalCount,
                    radiusInMiles,
                    latitude,
                    longitude);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing inspector search request");
                return BadRequest(new { error = "Invalid search parameters" });
            }
        }

        /// <summary>
        /// Creates a new inspector profile with validation and audit tracking.
        /// </summary>
        /// <param name="request">Inspector creation details</param>
        /// <returns>Created inspector ID</returns>
        [HttpPost]
        [Authorize(Roles = "Admin,Operations")]
        [ProducesResponseType(typeof(int), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [SwaggerOperation(Summary = "Create new inspector", Tags = new[] { "Inspectors" })]
        public async Task<ActionResult<int>> Create([FromBody] CreateInspectorCommand request)
        {
            try
            {
                var inspectorId = await _mediator.Send(request);

                // Invalidate relevant cache entries
                var cachePattern = $"{CACHE_KEY_PREFIX}Search_*";
                _cache.Remove(cachePattern);

                _logger.LogInformation("Created new inspector with ID: {InspectorId}", inspectorId);

                return CreatedAtAction(
                    nameof(GetById),
                    new { id = inspectorId },
                    inspectorId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating inspector");
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// Mobilizes an inspector for assignment with comprehensive validation.
        /// </summary>
        /// <param name="id">Inspector ID to mobilize</param>
        /// <param name="notes">Optional mobilization notes</param>
        /// <returns>No content on success</returns>
        [HttpPost("{id}/mobilize")]
        [Authorize(Roles = "Admin,Operations")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [SwaggerOperation(Summary = "Mobilize inspector", Tags = new[] { "Inspectors" })]
        public async Task<IActionResult> Mobilize(
            int id,
            [FromBody] string notes = null)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
                var command = new MobilizeInspectorCommand(id, userId, notes);
                
                await _mediator.Send(command);

                // Invalidate relevant cache entries
                var cachePattern = $"{CACHE_KEY_PREFIX}Search_*";
                _cache.Remove(cachePattern);

                _logger.LogInformation("Successfully mobilized inspector ID: {InspectorId}", id);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error mobilizing inspector ID: {InspectorId}", id);
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// Retrieves inspector details by ID.
        /// </summary>
        /// <param name="id">Inspector ID</param>
        /// <returns>Inspector details</returns>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(InspectorDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [SwaggerOperation(Summary = "Get inspector by ID", Tags = new[] { "Inspectors" })]
        public async Task<ActionResult<InspectorDto>> GetById(int id)
        {
            try
            {
                var cacheKey = $"{CACHE_KEY_PREFIX}{id}";

                if (_cache.TryGetValue(cacheKey, out InspectorDto cachedInspector))
                {
                    return Ok(cachedInspector);
                }

                // Implementation would use a GetInspectorByIdQuery
                // For now, return NotFound as the query isn't provided
                return NotFound();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving inspector ID: {InspectorId}", id);
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
