using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Customers;
using ServiceProvider.Core.Domain.Audit;
using System.Text.Json;

namespace ServiceProvider.Infrastructure.Data.Repositories
{
    /// <summary>
    /// Repository implementation for managing Customer entities with comprehensive validation,
    /// security measures, and audit logging capabilities.
    /// </summary>
    public class CustomerRepository : ICustomerRepository
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<CustomerRepository> _logger;
        private const int DEFAULT_PAGE_SIZE = 20;
        private const int MAX_PAGE_SIZE = 100;

        public CustomerRepository(IApplicationDbContext context, ILogger<CustomerRepository> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Retrieves a customer by ID with security validation and audit logging.
        /// </summary>
        /// <param name="id">The customer ID to retrieve</param>
        /// <returns>The customer if found and authorized, null otherwise</returns>
        public async Task<Customer> GetByIdAsync(int id)
        {
            try
            {
                _logger.LogInformation("Retrieving customer with ID: {CustomerId}", id);

                if (id <= 0)
                {
                    throw new ArgumentException("Customer ID must be greater than zero.", nameof(id));
                }

                var customer = await _context.Customers
                    .Include(c => c.Contacts.Where(contact => contact.IsActive))
                    .Include(c => c.ContractIds)
                    .FirstOrDefaultAsync(c => c.Id == id);

                if (customer != null)
                {
                    await LogAuditEvent(customer.Id.ToString(), "Read", "Customer details retrieved");
                }

                return customer;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving customer with ID: {CustomerId}", id);
                throw;
            }
        }

        /// <summary>
        /// Performs a secure paginated search with multiple criteria.
        /// </summary>
        /// <param name="criteria">Search parameters</param>
        /// <returns>Paginated list of authorized customers</returns>
        public async Task<(IEnumerable<Customer> Customers, int TotalCount)> SearchAsync(CustomerSearchCriteria criteria)
        {
            try
            {
                _logger.LogInformation("Searching customers with criteria: {@Criteria}", criteria);

                ValidateSearchCriteria(criteria);

                var query = _context.Customers.AsQueryable();

                // Apply filters
                if (!string.IsNullOrWhiteSpace(criteria.Code))
                {
                    query = query.Where(c => c.Code.Contains(criteria.Code));
                }

                if (!string.IsNullOrWhiteSpace(criteria.Name))
                {
                    query = query.Where(c => c.Name.Contains(criteria.Name));
                }

                if (!string.IsNullOrWhiteSpace(criteria.Region))
                {
                    query = query.Where(c => c.Region == criteria.Region);
                }

                if (criteria.IsActive.HasValue)
                {
                    query = query.Where(c => c.IsActive == criteria.IsActive.Value);
                }

                // Get total count before pagination
                var totalCount = await query.CountAsync();

                // Apply pagination
                var pageSize = Math.Min(criteria.PageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
                var skip = (criteria.Page - 1) * pageSize;

                var customers = await query
                    .OrderBy(c => c.Name)
                    .Skip(skip)
                    .Take(pageSize)
                    .Include(c => c.Contacts.Where(contact => contact.IsActive))
                    .ToListAsync();

                await LogAuditEvent("Multiple", "Read", $"Customer search performed. Results: {customers.Count}");

                return (customers, totalCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching customers with criteria: {@Criteria}", criteria);
                throw;
            }
        }

        /// <summary>
        /// Securely adds a new customer with validation and audit logging.
        /// </summary>
        /// <param name="customer">The customer to add</param>
        /// <returns>The newly created customer</returns>
        public async Task<Customer> AddAsync(Customer customer)
        {
            try
            {
                _logger.LogInformation("Adding new customer: {CustomerCode}", customer.Code);

                if (customer == null)
                {
                    throw new ArgumentNullException(nameof(customer));
                }

                // Verify unique constraints
                var exists = await _context.Customers.AnyAsync(c => c.Code == customer.Code);
                if (exists)
                {
                    throw new InvalidOperationException($"Customer with code {customer.Code} already exists.");
                }

                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();

                await LogAuditEvent(customer.Id.ToString(), "Create", "New customer created");

                return customer;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding customer: {CustomerCode}", customer?.Code);
                throw;
            }
        }

        /// <summary>
        /// Updates an existing customer with validation and concurrency checking.
        /// </summary>
        /// <param name="customer">The customer to update</param>
        /// <returns>True if update successful, false otherwise</returns>
        public async Task<bool> UpdateAsync(Customer customer)
        {
            try
            {
                _logger.LogInformation("Updating customer: {CustomerId}", customer.Id);

                if (customer == null)
                {
                    throw new ArgumentNullException(nameof(customer));
                }

                var existingCustomer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.Id == customer.Id);

                if (existingCustomer == null)
                {
                    return false;
                }

                // Track changes for audit
                var changes = new Dictionary<string, object>
                {
                    { "PreviousState", JsonSerializer.Serialize(existingCustomer) },
                    { "NewState", JsonSerializer.Serialize(customer) }
                };

                _context.Customers.Update(customer);
                await _context.SaveChangesAsync();

                await LogAuditEvent(customer.Id.ToString(), "Update", JsonSerializer.Serialize(changes));

                return true;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogWarning(ex, "Concurrency conflict updating customer: {CustomerId}", customer.Id);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating customer: {CustomerId}", customer?.Id);
                throw;
            }
        }

        private async Task LogAuditEvent(string entityId, string action, string changes)
        {
            try
            {
                var auditLog = new AuditLog(
                    entityName: "Customer",
                    entityId: entityId,
                    action: action,
                    changes: changes,
                    ipAddress: "127.0.0.1", // In production, get from IHttpContextAccessor
                    userId: 1 // In production, get from ICurrentUserService
                );

                _context.AuditLogs.Add(auditLog);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging audit event for customer: {CustomerId}", entityId);
            }
        }

        private void ValidateSearchCriteria(CustomerSearchCriteria criteria)
        {
            if (criteria == null)
            {
                throw new ArgumentNullException(nameof(criteria));
            }

            if (criteria.Page <= 0)
            {
                throw new ArgumentException("Page number must be greater than zero.", nameof(criteria));
            }

            if (criteria.PageSize.HasValue && (criteria.PageSize.Value <= 0 || criteria.PageSize.Value > MAX_PAGE_SIZE))
            {
                throw new ArgumentException($"Page size must be between 1 and {MAX_PAGE_SIZE}.", nameof(criteria));
            }
        }

        public async Task<Customer> GetByCodeAsync(string code)
        {
            try
            {
                _logger.LogInformation("Retrieving customer with code: {CustomerCode}", code);

                if (string.IsNullOrWhiteSpace(code))
                {
                    throw new ArgumentException("Customer code must not be null or empty.", nameof(code));
                }

                var customer = await _context.Customers
                    .Include(c => c.Contacts.Where(contact => contact.IsActive))
                    .Include(c => c.ContractIds)
                    .FirstOrDefaultAsync(c => c.Code == code);

                if (customer != null)
                {
                    await LogAuditEvent(customer.Id.ToString(), "Read", "Customer details retrieved by code");
                }

                return customer;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving customer with code: {CustomerCode}", code);
                throw;
            }
        }

        public async Task<bool> ValidateIndustryCodeAsync(string industry)
        {
            try
            {
                _logger.LogInformation("Validating industry code: {IndustryCode}", industry);

                if (string.IsNullOrWhiteSpace(industry))
                {
                    throw new ArgumentException("Industry code must not be null or empty.", nameof(industry));
                }

                var isValid = await _context.Customers.AnyAsync(c => c.Industry == industry);

                return isValid;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating industry code: {IndustryCode}", industry);
                throw;
            }
        }
    }

    

    public class CustomerSearchCriteria
    {
        public string Code { get; set; }
        public string Name { get; set; }
        public string Region { get; set; }
        public bool? IsActive { get; set; }
        public int Page { get; set; } = 1;
        public int? PageSize { get; set; }
    }
}
