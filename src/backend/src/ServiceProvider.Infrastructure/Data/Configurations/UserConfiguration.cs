using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ServiceProvider.Core.Domain.Users;

namespace ServiceProvider.Infrastructure.Data.Configurations
{
    /// <summary>
    /// Entity Framework Core configuration class for the User entity.
    /// Implements comprehensive database schema, security, and audit configurations.
    /// </summary>
    public class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            // Table configuration
            builder.ToTable("users", "identity", tb =>
            {
                tb.IsTemporal(ttb =>
                {
                    ttb.UseHistoryTable("users_history", "identity");
                    ttb.HasPeriodStart("ValidFrom");
                    ttb.HasPeriodEnd("ValidTo");
                    // 7-year retention policy as per technical specs
                    //ttb.SetHistoryRetentionPeriod(TimeSpan.FromDays(365 * 7));
                });
            });

            // Primary key
            builder.HasKey(u => u.Id);
            builder.Property(u => u.Id)
                .UseIdentityColumn()
                .IsRequired();

            // Email configuration with encryption
            builder.Property(u => u.Email)
                .HasMaxLength(256)
                .IsRequired()
                .IsUnicode(false)
                .HasColumnType("varchar(256)");
                //.UseEncryption(); // SQL Server Always Encrypted

            builder.Property(u => u.NormalizedEmail)
                .HasMaxLength(256)
                .IsRequired()
                .IsUnicode(false)
                .HasColumnType("varchar(256)");

            // Name configuration
            builder.Property(u => u.FirstName)
                .HasMaxLength(100)
                .IsRequired()
                .IsUnicode(true);

            builder.Property(u => u.LastName)
                .HasMaxLength(100)
                .IsRequired()
                .IsUnicode(true);

            // Phone number with encryption
            builder.Property(u => u.PhoneNumber)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnType("varchar(20)");
                //.UseEncryption(); // SQL Server Always Encrypted

            // Azure AD B2C ID
            builder.Property(u => u.AzureAdB2CId)
                .HasMaxLength(36)
                .IsRequired()
                .IsUnicode(false)
                .HasColumnType("char(36)");

            // Status and tracking fields
            builder.Property(u => u.IsActive)
                .IsRequired()
                .HasDefaultValue(true);

            builder.Property(u => u.CreatedAt)
                .IsRequired()
                .HasPrecision(3)
                .HasDefaultValueSql("GETUTCDATE()");

            builder.Property(u => u.ModifiedAt)
                .HasPrecision(3);

            builder.Property(u => u.LastLoginAt)
                .HasPrecision(3);

            builder.Property(u => u.LoginAttempts)
                .IsRequired()
                .HasDefaultValue(0);

            builder.Property(u => u.IsLocked)
                .IsRequired()
                .HasDefaultValue(false);

            builder.Property(u => u.LockoutEnd)
                .HasPrecision(3);

            builder.Property(u => u.PreferredLanguage)
                .HasMaxLength(10)
                .IsUnicode(false)
                .HasDefaultValue("en-US");

            builder.Property(u => u.IsMfaEnabled)
                .IsRequired()
                .HasDefaultValue(false);

            builder.Property(u => u.AuditTrail)
                .HasColumnType("nvarchar(max)");

            // Relationships
            builder.HasMany(u => u.UserRoles)
                .WithOne()
                .HasForeignKey(ur => ur.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            builder.HasIndex(u => u.NormalizedEmail)
                .IsUnique()
                .HasFilter("[IsActive] = 1")
                .IncludeProperties(u => new { u.FirstName, u.LastName });

            builder.HasIndex(u => u.AzureAdB2CId)
                .IsUnique()
                .HasFilter("[IsActive] = 1");

            builder.HasIndex(u => new { u.LastName, u.FirstName })
                .HasFilter("[IsActive] = 1")
                .IncludeProperties(u => new { u.Email, u.PhoneNumber });

            builder.HasIndex(u => u.LastLoginAt)
                .HasFilter("[IsActive] = 1");

            // Data masking for sensitive fields
            builder.Property(u => u.Email);
                //.HasSensitiveDataMasking();

                builder.Property(u => u.PhoneNumber);
                //.HasSensitiveDataMasking();

            // Check constraints
            builder.ToTable(tb =>
            {
                //tb.HasCheckConstraint("CK_User_Email", "LEN([Email]) <= 256");
                //tb.HasCheckConstraint("CK_User_Names", "LEN([FirstName]) <= 100 AND LEN([LastName]) <= 100");
                //tb.HasCheckConstraint("CK_User_LoginAttempts", "[LoginAttempts] >= 0");
            });

            // Row-level security
            builder.ToTable(tb =>
            {
                //tb.HasSecurityPolicy("UserSecurityPolicy", 
                //    @"CREATE SECURITY POLICY [identity].[UserSecurityPolicy]
                //      ADD FILTER PREDICATE [identity].[fn_userAccessPredicate]([Id]) ON [identity].[users],
                //      ADD BLOCK PREDICATE [identity].[fn_userAccessPredicate]([Id]) ON [identity].[users]");
            });

            // Compression settings
            builder.ToTable(tb =>
            {
                //tb.HasDataCompression(DataCompressionType.Page);
            });
        }
    }
}
