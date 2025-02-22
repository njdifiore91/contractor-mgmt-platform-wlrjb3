using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ServiceProvider.Core.Domain.Audit;

namespace ServiceProvider.Infrastructure.Data.Configurations
{
    /// <summary>
    /// Entity Framework Core configuration class for the AuditLog entity.
    /// Implements comprehensive audit trail schema with optimized indexes and constraints
    /// for security monitoring and compliance requirements.
    /// </summary>
    public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
    {
        public void Configure(EntityTypeBuilder<AuditLog> builder)
        {
            // Table configuration
            builder.ToTable("AuditLogs");

            // Primary key configuration
            builder.HasKey(a => a.Id);
            builder.Property(a => a.Id)
                .UseIdentityColumn()
                .IsRequired();

            // User relationship configuration
            builder.HasOne(a => a.User)
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);

            // Entity tracking fields
            builder.Property(a => a.EntityName)
                .HasColumnType("nvarchar(100)")
                .IsRequired();

            builder.Property(a => a.EntityId)
                .HasColumnType("nvarchar(50)")
                .IsRequired();

            // Action and changes tracking
            builder.Property(a => a.Action)
                .HasColumnType("nvarchar(50)")
                .IsRequired();

            builder.Property(a => a.Changes)
                .HasColumnType("nvarchar(4000)")
                .IsRequired();

            // Security tracking fields
            builder.Property(a => a.IpAddress)
                .HasColumnType("nvarchar(50)")
                .IsRequired();

            builder.Property(a => a.Timestamp)
                .HasColumnType("datetime2")
                .IsRequired()
                .HasDefaultValueSql("SYSUTCDATETIME()");

            // Performance optimized indexes
            builder.HasIndex(a => a.Timestamp)
                .HasDatabaseName("IX_AuditLogs_Timestamp")
                .IsClustered(false);

            builder.HasIndex(a => new { a.EntityName, a.EntityId })
                .HasDatabaseName("IX_AuditLogs_Entity")
                .IsClustered(false);

            builder.HasIndex(a => new { a.UserId, a.Timestamp })
                .HasDatabaseName("IX_AuditLogs_UserActivity")
                .IsClustered(false);

            builder.HasIndex(a => new { a.Action, a.Timestamp })
                .HasDatabaseName("IX_AuditLogs_ActionTracking")
                .IsClustered(false);

            // Query filters for efficient retrieval
            builder.HasQueryFilter(a => a.Timestamp <= DateTime.UtcNow);

            // Temporal table configuration for change tracking
            builder.ToTable(tb => tb.IsTemporal(ttb =>
            {
                ttb.HasPeriodStart("ValidFrom");
                ttb.HasPeriodEnd("ValidTo");
                ttb.UseHistoryTable("AuditLogsHistory");
            }));
        }
    }
}