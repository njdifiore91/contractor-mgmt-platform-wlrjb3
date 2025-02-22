using Microsoft.EntityFrameworkCore; // v6.0.0
using Microsoft.EntityFrameworkCore.Metadata.Builders; // v6.0.0
using Microsoft.EntityFrameworkCore.SqlServer.NetTopologySuite; // v6.0.0
using ServiceProvider.Core.Domain.Inspectors;

namespace ServiceProvider.Infrastructure.Data.Configurations
{
    /// <summary>
    /// Entity Framework Core configuration class for the Inspector entity.
    /// Implements comprehensive database schema configuration including spatial indexing,
    /// relationships, constraints, and security features.
    /// </summary>
    public class InspectorConfiguration : IEntityTypeConfiguration<Inspector>
    {
        public void Configure(EntityTypeBuilder<Inspector> builder)
        {
            // Table configuration
            builder.ToTable("Inspectors", "dbo", tb =>
            {
                tb.IsTemporal(); // Enable temporal tables for audit history
                tb.HasComment("Stores inspector profiles with location tracking and status management");
            });

            // Primary key
            builder.HasKey(i => i.Id);
            builder.Property(i => i.Id)
                .UseIdentityColumn()
                .HasComment("Unique identifier for the inspector");

            // Foreign key to Users table
            builder.HasOne(i => i.User)
                .WithOne()
                .HasForeignKey<Inspector>(i => i.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired()
                .HasComment("Associated user account reference");

            // Badge number configuration
            builder.Property(i => i.BadgeNumber)
                .HasMaxLength(50)
                .IsRequired()
                .HasComment("Unique inspector identification number");
            
            builder.HasIndex(i => i.BadgeNumber)
                .IsUnique()
                .HasDatabaseName("IX_Inspectors_BadgeNumber")
                .IsClustered(false);

            // Location configuration with spatial indexing
            builder.Property(i => i.Location)
                .HasColumnType("geography")
                .IsRequired()
                .HasComment("Geographic location for proximity searches");

            builder.HasIndex(i => i.Location)
                .HasDatabaseName("SPATIAL_Inspectors_Location")
                .IsSpatial();

            // Status configuration
            builder.Property(i => i.Status)
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired()
                .HasComment("Current inspector status (Inactive, Available, Mobilized, Suspended)");

            builder.HasCheckConstraint(
                "CK_Inspectors_Status",
                "Status IN ('Inactive', 'Available', 'Mobilized', 'Suspended')");

            // Date tracking fields
            builder.Property(i => i.LastMobilizedDate)
                .HasColumnType("datetime2(7)")
                .HasComment("Most recent mobilization date");

            builder.Property(i => i.LastDrugTestDate)
                .HasColumnType("datetime2(7)")
                .HasComment("Most recent drug test date");

            // Active status
            builder.Property(i => i.IsActive)
                .IsRequired()
                .HasDefaultValue(true)
                .HasComment("Indicates if the inspector record is active");

            // Audit fields
            builder.Property(i => i.CreatedAt)
                .HasColumnType("datetime2(7)")
                .IsRequired()
                .HasDefaultValueSql("SYSUTCDATETIME()")
                .HasComment("Record creation timestamp");

            builder.Property(i => i.ModifiedAt)
                .HasColumnType("datetime2(7)")
                .HasComment("Last modification timestamp");

            // Relationships
            builder.HasMany(i => i.Certifications)
                .WithOne()
                .HasForeignKey("InspectorId")
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(i => i.DrugTests)
                .WithOne()
                .HasForeignKey("InspectorId")
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(i => i.EquipmentAssignments)
                .WithOne()
                .HasForeignKey("InspectorId")
                .OnDelete(DeleteBehavior.Restrict);

            // Indexes for performance
            builder.HasIndex(i => i.UserId)
                .HasDatabaseName("IX_Inspectors_UserId");

            builder.HasIndex(i => i.Status)
                .HasDatabaseName("IX_Inspectors_Status");

            builder.HasIndex(i => new { i.IsActive, i.Status })
                .HasDatabaseName("IX_Inspectors_IsActive_Status");

            // Row-level security filter
            builder.HasQueryFilter(i => i.IsActive);
        }
    }
}