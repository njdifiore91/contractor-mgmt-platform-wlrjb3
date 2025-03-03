using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Users;
using ServiceProvider.Core.Domain.Customers;
using ServiceProvider.Core.Domain.Equipment;
using ServiceProvider.Core.Domain.Inspectors;
using ServiceProvider.Core.Domain.Audit;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Text.Json;
using Microsoft.EntityFrameworkCore.Storage;

namespace ServiceProvider.Infrastructure.Data
{
    /// <summary>
    /// Entity Framework Core database context that provides centralized data access,
    /// audit logging, security enforcement, and database operations management.
    /// </summary>
    public class ApplicationDbContext : DbContext, IApplicationDbContext
    {
        private readonly ICurrentUserService _currentUserService;

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Contact> Contacts { get; set; }
        public DbSet<Contract> Contracts { get; set; }
        public DbSet<Equipment> Equipment { get; set; }
        public DbSet<EquipmentAssignment> EquipmentAssignments { get; set; }
        public DbSet<Inspector> Inspectors { get; set; }
        public DbSet<DrugTest> DrugTests { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }

        public ApplicationDbContext(
            DbContextOptions<ApplicationDbContext> options,
            ICurrentUserService currentUserService) : base(options)
        {
            _currentUserService = currentUserService;
            ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasIndex(e => e.AzureAdB2CId).IsUnique();
                entity.Property(e => e.Email).IsRequired().HasMaxLength(254);
                entity.Property(e => e.NormalizedEmail).IsRequired().HasMaxLength(254);
                entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.AuditTrail).HasColumnType("nvarchar(max)");
            });

            // Role configuration
            modelBuilder.Entity<Role>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.NormalizedName).IsUnique();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Description).HasMaxLength(200);
            });

            // UserRole configuration
            modelBuilder.Entity<UserRole>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.UserId, e.RoleId }).IsUnique();
                entity.Property(e => e.AssignedAt).IsRequired();
            });

            // Customer configuration
            modelBuilder.Entity<Customer>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Code).IsUnique();
                entity.Property(e => e.Code).IsRequired().HasMaxLength(7);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Industry).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Region).IsRequired().HasMaxLength(50);
            });

            // Inspector configuration
            modelBuilder.Entity<Inspector>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.BadgeNumber).IsUnique();
                entity.Property(e => e.BadgeNumber).IsRequired().HasMaxLength(20);
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Equipment configuration
            modelBuilder.Entity<Equipment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.SerialNumber).IsUnique();
                entity.Property(e => e.SerialNumber).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Model).IsRequired().HasMaxLength(100);
            });

            // DrugTest configuration
            modelBuilder.Entity<DrugTest>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TestKitId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.TestType).IsRequired().HasMaxLength(50);
                entity.HasOne(e => e.Inspector)
                    .WithMany(i => i.DrugTests)
                    .HasForeignKey(e => e.InspectorId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // AuditLog configuration
            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.EntityName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.EntityId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Action).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Changes).IsRequired().HasColumnType("nvarchar(max)");
                entity.Property(e => e.IpAddress).IsRequired().HasMaxLength(45);
            });

            // Global query filters
            modelBuilder.Entity<User>().HasQueryFilter(e => e.IsActive);
            modelBuilder.Entity<Customer>().HasQueryFilter(e => e.IsActive);
            modelBuilder.Entity<Inspector>().HasQueryFilter(e => e.IsActive);
            modelBuilder.Entity<Equipment>().HasQueryFilter(e => e.IsActive);

            //modelBuilder.Entity<EquipmentAssignment.ConditionChange>().HasNoKey();

            // EquipmentAssignment configuration
            //modelBuilder.Entity<EquipmentAssignment>(entity =>
            //{
            //    entity.HasKey(e => e.Id);
            //    entity.Property(e => e.Condition).IsRequired().HasMaxLength(100);
            //    entity.Property(e => e.ReturnCondition).HasMaxLength(100);
            //    entity.Property(e => e.LastModifiedBy).HasMaxLength(100);
            //    //entity.HasMany(e => e.ConditionHistory)
            //    //      .WithOne()
            //    //      .HasForeignKey("EquipmentAssignmentId")
            //    //      .OnDelete(DeleteBehavior.Cascade);
            //    entity.OwnsMany(e => e.ConditionHistory, ch =>
            //    {
            //        ch.WithOwner().HasForeignKey("EquipmentAssignmentId");
            //        // Define a key for the owned entity (either a generated key or composite key)
            //        ch.HasKey("Id"); // assuming ConditionChange has an 'Id' property
            //        // Additional configuration if needed (e.g., property lengths, table name, etc.)
            //    });
            //});

            // ConditionChange configuration
            modelBuilder.Entity<EquipmentAssignment.ConditionChange>(entity =>
            {
                entity.HasNoKey();
                entity.Property(e => e.PreviousCondition).IsRequired().HasMaxLength(100);
                entity.Property(e => e.NewCondition).IsRequired().HasMaxLength(100);
            });
            // Seed initial data
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var entries = ChangeTracker.Entries<IAuditableEntity>()
                .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified)
                .ToList();

            var userId = _currentUserService.UserId;
            var timestamp = DateTime.UtcNow;

            foreach (var entry in entries)
            {
                switch (entry.State)
                {
                    case EntityState.Added:
                        entry.Property("CreatedAt").CurrentValue = timestamp;
                        break;
                    case EntityState.Modified:
                        entry.Property("ModifiedAt").CurrentValue = timestamp;
                        break;
                }

                // Create audit log entry
                var auditLog = new AuditLog(
                    entityName: entry.Entity.GetType().Name,
                    entityId: entry.Property("Id").CurrentValue?.ToString(),
                    action: entry.State == EntityState.Added ? "Create" : "Update",
                    changes: JsonSerializer.Serialize(GetChanges(entry)),
                    ipAddress: GetClientIpAddress(),
                    userId: userId
                );

                AuditLogs.Add(auditLog);
            }

            return await base.SaveChangesAsync(cancellationToken);
        }

        public async Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken)
        {
            var transaction = await Database.BeginTransactionAsync(cancellationToken);
            return transaction;
        }

        private static object GetChanges(EntityEntry entry)
        {
            return entry.Properties
                .Where(p => p.IsModified || entry.State == EntityState.Added)
                .ToDictionary(
                    p => p.Metadata.Name,
                    p => new
                    {
                        OldValue = p.OriginalValue,
                        NewValue = p.CurrentValue
                    }
                );
        }

        private string GetClientIpAddress()
        {
            // In a real implementation, this would get the client IP from the current HTTP context
            return "127.0.0.1";
        }
    }

    public interface IAuditableEntity
    {
        DateTime CreatedAt { get; }
        DateTime? ModifiedAt { get; }
    }
}
