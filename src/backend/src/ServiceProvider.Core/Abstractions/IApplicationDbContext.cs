using Microsoft.EntityFrameworkCore;
using ServiceProvider.Core.Domain.Users;
using ServiceProvider.Core.Domain.Customers;
using ServiceProvider.Core.Domain.Equipment;
using ServiceProvider.Core.Domain.Inspectors;
using ServiceProvider.Core.Domain.Audit;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore.Storage;

namespace ServiceProvider.Core.Abstractions
{
    /// <summary>
    /// Core interface that defines the database context contract for Entity Framework Core.
    /// Implements the Repository pattern and provides strongly-typed access to entity collections
    /// with built-in change tracking and transaction support.
    /// </summary>
    public interface IApplicationDbContext
    {
        /// <summary>
        /// Gets or sets the DbSet for User entities.
        /// Provides CRUD operations and change tracking for user management.
        /// </summary>
        DbSet<User> Users { get; set; }

        /// <summary>
        /// Gets or sets the DbSet for Role entities.
        /// Manages role-based access control assignments.
        /// </summary>
        DbSet<Role> Roles { get; set; }

        /// <summary>
        /// Gets or sets the DbSet for Customer entities.
        /// Handles customer profile and relationship management.
        /// </summary>
        DbSet<Customer> Customers { get; set; }

        /// <summary>
        /// Gets or sets the DbSet for Contract entities.
        /// Manages customer service agreements and terms.
        /// </summary>
        DbSet<Contract> Contracts { get; set; }

        /// <summary>
        /// Gets or sets the DbSet for Equipment entities.
        /// Tracks inventory and equipment assignments.
        /// </summary>
        DbSet<Equipment> Equipment { get; set; }

        /// <summary>
        /// Gets or sets the DbSet for Inspector entities.
        /// Manages service provider profiles and status.
        /// </summary>
        DbSet<Inspector> Inspectors { get; set; }

        /// <summary>
        /// Gets or sets the DbSet for DrugTest entities.
        /// Tracks compliance and testing requirements.
        /// </summary>
        DbSet<DrugTest> DrugTests { get; set; }

        /// <summary>
        /// Gets or sets the DbSet for AuditLog entities.
        /// Records system changes for security and compliance.
        /// </summary>
        DbSet<AuditLog> AuditLogs { get; set; }

        /// <summary>
        /// Asynchronously saves all changes made in this context to the database.
        /// Implements transaction handling and change tracking.
        /// </summary>
        /// <param name="cancellationToken">A token to observe while waiting for the task to complete.</param>
        /// <returns>A task representing the asynchronous save operation, returning the number of affected records.</returns>
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

        Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken);
    }
}
