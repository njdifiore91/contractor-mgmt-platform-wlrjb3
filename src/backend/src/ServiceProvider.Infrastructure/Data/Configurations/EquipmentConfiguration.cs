using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ServiceProvider.Core.Domain.Equipment;

namespace ServiceProvider.Infrastructure.Data.Configurations
{
    /// <summary>
    /// Configures the database schema, relationships, constraints, and audit tracking 
    /// for the Equipment entity using Entity Framework Core's fluent API
    /// </summary>
    public class EquipmentConfiguration : IEntityTypeConfiguration<Equipment>
    {
        public void Configure(EntityTypeBuilder<Equipment> builder)
        {
            // Table configuration with temporal table support
            builder.ToTable("Equipment", b => b.IsTemporal(t =>
            {
                t.HasPeriodEnd("ValidTo");
                t.HasPeriodStart("ValidFrom");
                t.UseHistoryTable("EquipmentHistory");
            }));

            // Primary key
            builder.HasKey(e => e.Id);
            builder.Property(e => e.Id)
                .UseIdentityColumn()
                .IsRequired();

            // Required properties with constraints
            builder.Property(e => e.SerialNumber)
                .IsRequired()
                .HasMaxLength(100);
            builder.HasIndex(e => e.SerialNumber)
                .IsUnique()
                .IsClustered(false)
                .HasDatabaseName("IX_Equipment_SerialNumber");

            builder.Property(e => e.Model)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(e => e.Type)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(50);

            builder.Property(e => e.Condition)
                .IsRequired()
                .HasMaxLength(500);

            builder.Property(e => e.IsActive)
                .IsRequired()
                .HasDefaultValue(true);

            builder.Property(e => e.IsAvailable)
                .IsRequired()
                .HasDefaultValue(true);

            // Date properties
            builder.Property(e => e.PurchaseDate)
                .IsRequired()
                .HasColumnType("datetime2(7)");

            builder.Property(e => e.LastMaintenanceDate)
                .HasColumnType("datetime2(7)");

            // Optional properties
            builder.Property(e => e.Notes)
                .HasMaxLength(1000);

            // Relationships
            builder.HasMany(e => e.Assignments)
                .WithOne(a => a.Equipment)
                .HasForeignKey(a => a.EquipmentId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(e => e.History)
                .WithOne(h => h.Equipment)
                .HasForeignKey(h => h.EquipmentId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes for common query patterns
            builder.HasIndex(e => e.Type)
                .HasDatabaseName("IX_Equipment_Type");

            builder.HasIndex(e => e.IsActive)
                .HasDatabaseName("IX_Equipment_IsActive");

            builder.HasIndex(e => e.IsAvailable)
                .HasDatabaseName("IX_Equipment_IsAvailable");

            builder.HasIndex(e => e.PurchaseDate)
                .HasDatabaseName("IX_Equipment_PurchaseDate");

            // Composite indexes for common queries
            builder.HasIndex(e => new { e.Type, e.IsAvailable })
                .HasDatabaseName("IX_Equipment_Type_IsAvailable");

            builder.HasIndex(e => new { e.IsActive, e.IsAvailable })
                .HasDatabaseName("IX_Equipment_IsActive_IsAvailable");

            // Audit properties
            builder.Property<DateTime>("CreatedAt")
                .HasColumnType("datetime2(7)")
                .ValueGeneratedOnAdd();

            builder.Property<DateTime>("ModifiedAt")
                .HasColumnType("datetime2(7)")
                .ValueGeneratedOnAddOrUpdate();

            builder.Property<string>("CreatedBy")
                .HasMaxLength(100);

            builder.Property<string>("ModifiedBy")
                .HasMaxLength(100);
        }
    }
}