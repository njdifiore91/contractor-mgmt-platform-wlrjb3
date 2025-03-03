using System;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;
using ServiceProvider.Core.Domain.Users;
using ServiceProvider.Infrastructure.Data.Repositories;
using System.Text.RegularExpressions;
using ServiceProvider.Core.Abstractions;

namespace ServiceProvider.Services.Users.Queries
{
    /// <summary>
    /// Represents a paginated search query for users with filtering and sorting capabilities.
    /// </summary>
    public class SearchUsersQuery : IRequest<SearchUsersResult>
    {
        public string SearchTerm { get; }
        public bool? IsActive { get; }
        public int PageNumber { get; }
        public int PageSize { get; }
        public string SortBy { get; }
        public bool SortDescending { get; }
        public string CorrelationId { get; }

        public SearchUsersQuery(
            string searchTerm = null,
            bool? isActive = null,
            int pageNumber = 1,
            int pageSize = 10,
            string sortBy = "LastName",
            bool sortDescending = false)
        {
            SearchTerm = searchTerm?.Trim();
            IsActive = isActive;
            PageNumber = pageNumber;
            PageSize = pageSize;
            SortBy = sortBy;
            SortDescending = sortDescending;
            CorrelationId = Guid.NewGuid().ToString();
        }
    }

    

    /// <summary>
    /// Validates search query parameters with comprehensive security rules.
    /// </summary>
    public class SearchUsersQueryValidator : AbstractValidator<SearchUsersQuery>
    {
        private static readonly string[] AllowedSortColumns = { "LastName", "FirstName", "Email", "CreatedAt" };
        private static readonly Regex SearchTermPattern = new(@"^[a-zA-Z0-9\s\-\.@]{0,100}$", RegexOptions.Compiled);

        public SearchUsersQueryValidator()
        {
            RuleFor(x => x.SearchTerm)
                .Must(term => string.IsNullOrEmpty(term) || SearchTermPattern.IsMatch(term))
                .WithMessage("Search term contains invalid characters or exceeds maximum length");

            RuleFor(x => x.PageNumber)
                .GreaterThan(0)
                .WithMessage("Page number must be greater than 0");

            RuleFor(x => x.PageSize)
                .InclusiveBetween(1, 100)
                .WithMessage("Page size must be between 1 and 100");

            RuleFor(x => x.SortBy)
                .Must(sortBy => AllowedSortColumns.Contains(sortBy))
                .WithMessage($"Sort column must be one of: {string.Join(", ", AllowedSortColumns)}");
        }
    }

    /// <summary>
    /// Handles user search requests with security measures and performance optimization.
    /// </summary>
    public class SearchUsersQueryHandler : IRequestHandler<SearchUsersQuery, SearchUsersResult>
    {
        private readonly UserRepository _userRepository;
        private readonly ILogger<SearchUsersQueryHandler> _logger;
        private readonly SearchUsersQueryValidator _validator;

        public SearchUsersQueryHandler(
            UserRepository userRepository,
            ILogger<SearchUsersQueryHandler> logger)
        {
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _validator = new SearchUsersQueryValidator();
        }

        /// <summary>
        /// Processes the search request with comprehensive validation and security measures.
        /// </summary>
        public async Task<SearchUsersResult> Handle(SearchUsersQuery request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation(
                    "Processing user search request. CorrelationId: {CorrelationId}, SearchTerm: {SearchTerm}",
                    request.CorrelationId,
                    request.SearchTerm ?? "null");

                // Validate request
                var validationResult = await _validator.ValidateAsync(request, cancellationToken);
                if (!validationResult.IsValid)
                {
                    var errors = string.Join(", ", validationResult.Errors);
                    _logger.LogWarning(
                        "Invalid search request. CorrelationId: {CorrelationId}, Errors: {Errors}",
                        request.CorrelationId,
                        errors);
                    throw new ValidationException(validationResult.Errors);
                }

                // Execute search with timeout
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(TimeSpan.FromSeconds(30)); // 30-second timeout

                var searchResult = await _userRepository.SearchAsync(
                    searchTerm: request.SearchTerm,
                    isActive: request.IsActive,
                    pageNumber: request.PageNumber,
                    pageSize: request.PageSize,
                    sortBy: request.SortBy,
                    sortDescending: request.SortDescending,
                    cancellationToken: cts.Token);

                _logger.LogInformation(
                    "User search completed. CorrelationId: {CorrelationId}, ResultCount: {ResultCount}",
                    request.CorrelationId,
                    searchResult.TotalCount);

                return searchResult;
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning(
                    "Search operation timed out. CorrelationId: {CorrelationId}",
                    request.CorrelationId);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error processing user search. CorrelationId: {CorrelationId}",
                    request.CorrelationId);
                throw;
            }
        }
    }
}
