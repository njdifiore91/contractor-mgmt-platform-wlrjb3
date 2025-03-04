using System;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MediatR;
using AutoMapper;
using Ardalis.GuardClauses;
using ServiceProvider.Core.Domain.Users;
using ServiceProvider.Core.Abstractions;

namespace ServiceProvider.Services.Users.Queries
{
    /// <summary>
    /// Query model for retrieving a user by their unique identifier.
    /// Implements CQRS pattern for read operations.
    /// </summary>
    public sealed class GetUserByIdQuery : IRequest<UserDto>
    {
        /// <summary>
        /// Gets the unique identifier of the user to retrieve.
        /// </summary>
        public int Id { get; }

        /// <summary>
        /// Initializes a new instance of GetUserByIdQuery with validation.
        /// </summary>
        /// <param name="id">The user ID to query</param>
        /// <exception cref="ArgumentException">Thrown when ID is invalid</exception>
        public GetUserByIdQuery(int id)
        {
            Guard.Against.NegativeOrZero(id, nameof(id), "User ID must be greater than zero.");
            Id = id;
        }
    }

    /// <summary>
    /// Data transfer object for user information with associated roles.
    /// </summary>
    public sealed class UserDto
    {
        public int Id { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ModifiedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public string PreferredLanguage { get; set; }
        public bool IsMfaEnabled { get; set; }
        public ICollection<UserRoleDto> Roles { get; set; }
    }

    /// <summary>
    /// Data transfer object for user role information.
    /// </summary>
    public sealed class UserRoleDto
    {
        public int RoleId { get; set; }
        public string RoleName { get; set; }
        public DateTime AssignedAt { get; set; }
    }

    /// <summary>
    /// Handler for processing GetUserByIdQuery requests with proper security and performance considerations.
    /// </summary>
    public sealed class GetUserByIdQueryHandler : IRequestHandler<GetUserByIdQuery, UserDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly IMapper _mapper;
        private readonly ILogger<GetUserByIdQueryHandler> _logger;

        /// <summary>
        /// Initializes a new instance of GetUserByIdQueryHandler with required dependencies.
        /// </summary>
        public GetUserByIdQueryHandler(
            IApplicationDbContext context,
            IMapper mapper,
            ILogger<GetUserByIdQueryHandler> logger)
        {
            _context = Guard.Against.Null(context, nameof(context));
            _mapper = Guard.Against.Null(mapper, nameof(mapper));
            _logger = Guard.Against.Null(logger, nameof(logger));
        }

        /// <summary>
        /// Handles the user retrieval query execution with proper error handling and logging.
        /// </summary>
        /// <param name="request">The query request containing user ID</param>
        /// <param name="cancellationToken">Cancellation token for async operations</param>
        /// <returns>User DTO if found, null if not found</returns>
        public async Task<UserDto> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Retrieving user with ID: {UserId}", request.Id);
                
                Guard.Against.Null(request, nameof(request));

                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .Where(u => u.Id == request.Id)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(cancellationToken);

                if (user == null)
                {
                    _logger.LogWarning("User not found with ID: {UserId}", request.Id);
                    return null;
                }

                var userDto = _mapper.Map<UserDto>(user);
                userDto.Roles = user.UserRoles
                    .Where(ur => ur.IsActive())
                    .Select(ur => new UserRoleDto
                    {
                        RoleId = ur.RoleId,
                        RoleName = ur.Role.Name,
                        AssignedAt = ur.AssignedAt
                    })
                    .ToList();

                _logger.LogInformation("Successfully retrieved user with ID: {UserId}", request.Id);
                return userDto;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user with ID: {UserId}", request.Id);
                throw;
            }
        }
    }
}
