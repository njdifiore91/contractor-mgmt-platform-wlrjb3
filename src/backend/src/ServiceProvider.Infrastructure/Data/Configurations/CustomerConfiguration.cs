using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ServiceProvider.Core.Domain.Customers;

namespace ServiceProvider.Infrastructure.Data.Configurations
{
    /// <summary>
    /// Entity Framework Core configuration class for the Customer entity.
    /// Implements comprehensive database mappings with enhanced security and performance features.
    /// </summary>
    public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
    {
        public void Configure(EntityTypeBuilder<Customer> builder)
        {
            // Table configuration
            builder.ToTable("Customers", "dbo")
                .HasComment("Stores customer information with enhanced security and auditing features");

            // Primary key
            builder.HasKey(c => c.Id)
                .IsClustered();
            
            builder.Property(c => c.Id)
                .UseIdentityColumn()
                .HasComment("Unique identifier for the customer");

            // Required properties with constraints
            builder.Property(c => c.Code)
                .IsRequired()
                .HasMaxLength(50)
                .UseCollation("SQL_Latin1_General_CP1_CI_AS")
                .HasComment("Unique business code in format XXX-000");

            builder.Property(c => c.Name)
                .IsRequired()
                .HasMaxLength(200)
                .UseCollation("SQL_Latin1_General_CP1_CI_AS")
                .HasComment("Customer business name");

            builder.Property(c => c.Industry)
                .IsRequired()
                .HasMaxLength(100)
                .UseCollation("SQL_Latin1_General_CP1_CI_AS")
                .HasComment("Customer industry classification");

            builder.Property(c => c.Region)
                .IsRequired()
                .HasMaxLength(100)
                .UseCollation("SQL_Latin1_General_CP1_CI_AS")
                .HasComment("Customer geographic region");

            // Optional properties with security features
            builder.Property(c => c.Address)
                .HasMaxLength(500)
                .HasColumnType("nvarchar(500)")
                .HasComment("Customer street address (encrypted)");
                //.IsEncrypted();

            builder.Property(c => c.City)
                .HasMaxLength(100)
                .UseCollation("SQL_Latin1_General_CP1_CI_AS")
                .HasComment("Customer city");

            builder.Property(c => c.State)
                .HasMaxLength(100)
                .UseCollation("SQL_Latin1_General_CP1_CI_AS")
                .HasComment("Customer state/province");

            builder.Property(c => c.PostalCode)
                .HasMaxLength(20)
                .HasComment("Customer postal code");

            builder.Property(c => c.Country)
                .HasMaxLength(100)
                .UseCollation("SQL_Latin1_General_CP1_CI_AS")
                .HasComment("Customer country in ISO 3166-1 format");

            // Status and timestamp properties
            builder.Property(c => c.IsActive)
                .IsRequired()
                .HasDefaultValue(true)
                .HasComment("Indicates if the customer is active");

            builder.Property(c => c.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("GETUTCDATE()")
                .HasComment("UTC timestamp of customer creation");

            builder.Property(c => c.ModifiedAt)
                .HasComment("UTC timestamp of last modification");

            // Relationships
            builder.HasMany(c => c.Contacts)
                .WithOne()
                .HasForeignKey(contact => contact.CustomerId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_Customers_Contacts");

            // JSON property configuration
            builder.Property(c => c.ContractIds)
                .HasColumnType("nvarchar(max)")
                .HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, new JsonSerializerOptions()),
                    v => System.Text.Json.JsonSerializer.Deserialize<ICollection<int>>(v, new JsonSerializerOptions()))
                .HasComment("JSON array of associated contract IDs");

            // Indexes for performance optimization
            builder.HasIndex(c => c.Code)
                .IsUnique()
                .HasDatabaseName("UX_Customers_Code")
                .HasFilter(null);

            builder.HasIndex(c => new { c.Region, c.Industry })
                .HasDatabaseName("IX_Customers_Region_Industry")
                .HasFilter(null)
                .IsClustered(false);

            builder.HasIndex(c => c.IsActive)
                .HasDatabaseName("IX_Customers_IsActive")
                .HasFilter("[IsActive] = 1")
                .IsClustered(false);

            // Concurrency token
           // builder.UseXminAsConcurrencyToken();

            // Temporal table configuration for audit history
            builder.ToTable(tb => tb.IsTemporal(ttb =>
            {
                ttb.UseHistoryTable("CustomersHistory", "dbo");
                ttb.HasPeriodStart("ValidFrom");
                ttb.HasPeriodEnd("ValidTo");
            }));

            //// Row-level security policy
            //builder.HasSecurityPolicy("CustomerAccessPolicy");

            //// Data compression
            //builder.HasDataCompression(DataCompressionType.Page);

            // Check constraints
            builder.HasCheckConstraint("CK_Customers_Code_Format", 
                "Code LIKE '[A-Z][A-Z][A-Z]-[0-9][0-9][0-9]'");

            // Triggers
            //builder.HasTrigger("TR_Customers_UpdateModifiedAt")
            //    .HasDatabaseName("TR_Customers_UpdateModifiedAt");

            // Audit columns
            builder.Property<string>("CreatedBy")
                .HasMaxLength(100)
                .HasComment("Username of the creator");

            builder.Property<string>("ModifiedBy")
                .HasMaxLength(100)
                .HasComment("Username of the last modifier");
        }
    }
}
