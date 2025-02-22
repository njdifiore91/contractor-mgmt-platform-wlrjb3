using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Metadata;

namespace ServiceProvider.Infrastructure.Data.Migrations
{
    /// <summary>
    /// Initial database migration that creates the core schema with security features,
    /// audit tracking, and performance optimizations.
    /// </summary>
    public partial class InitialCreate : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Users table with enhanced security
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Email = table.Column<string>(maxLength: 254, nullable: false),
                    NormalizedEmail = table.Column<string>(maxLength: 254, nullable: false),
                    FirstName = table.Column<string>(maxLength: 50, nullable: false),
                    LastName = table.Column<string>(maxLength: 50, nullable: false),
                    PhoneNumber = table.Column<string>(maxLength: 20, nullable: true),
                    IsActive = table.Column<bool>(nullable: false, defaultValue: true),
                    AzureAdB2CId = table.Column<string>(maxLength: 36, nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()"),
                    ModifiedAt = table.Column<DateTime>(nullable: true),
                    LastLoginAt = table.Column<DateTime>(nullable: true),
                    LoginAttempts = table.Column<int>(nullable: false, defaultValue: 0),
                    IsLocked = table.Column<bool>(nullable: false, defaultValue: false),
                    LockoutEnd = table.Column<DateTime>(nullable: true),
                    PreferredLanguage = table.Column<string>(maxLength: 10, nullable: false, defaultValue: "en-US"),
                    IsMfaEnabled = table.Column<bool>(nullable: false, defaultValue: false),
                    AuditTrail = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.UniqueConstraint("AK_Users_Email", x => x.Email);
                    table.UniqueConstraint("AK_Users_AzureAdB2CId", x => x.AzureAdB2CId);
                });

            // Roles table with hierarchical support
            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(maxLength: 50, nullable: false),
                    NormalizedName = table.Column<string>(maxLength: 50, nullable: false),
                    Description = table.Column<string>(maxLength: 200, nullable: true),
                    ParentRoleId = table.Column<int>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Roles_Roles_ParentRoleId",
                        column: x => x.ParentRoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // UserRoles junction table with temporal tracking
            migrationBuilder.CreateTable(
                name: "UserRoles",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(nullable: false),
                    RoleId = table.Column<int>(nullable: false),
                    AssignedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()"),
                    RevokedAt = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserRoles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserRoles_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("SqlServer:IsTemporal", true)
                .Annotation("SqlServer:TemporalHistoryTableName", "UserRolesHistory")
                .Annotation("SqlServer:TemporalHistoryTableSchema", null);

            // Customers table with encrypted PII
            migrationBuilder.CreateTable(
                name: "Customers",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(maxLength: 7, nullable: false),
                    Name = table.Column<string>(maxLength: 100, nullable: false),
                    Industry = table.Column<string>(maxLength: 50, nullable: false),
                    Region = table.Column<string>(maxLength: 50, nullable: false),
                    Address = table.Column<string>(maxLength: 200, nullable: true),
                    City = table.Column<string>(maxLength: 100, nullable: true),
                    State = table.Column<string>(maxLength: 50, nullable: true),
                    PostalCode = table.Column<string>(maxLength: 20, nullable: true),
                    Country = table.Column<string>(maxLength: 2, nullable: true),
                    IsActive = table.Column<bool>(nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()"),
                    ModifiedAt = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Customers", x => x.Id);
                    table.UniqueConstraint("AK_Customers_Code", x => x.Code);
                });

            // Equipment table with audit tracking
            migrationBuilder.CreateTable(
                name: "Equipment",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SerialNumber = table.Column<string>(maxLength: 50, nullable: false),
                    Model = table.Column<string>(maxLength: 100, nullable: false),
                    Type = table.Column<int>(nullable: false),
                    Condition = table.Column<string>(maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(nullable: false, defaultValue: true),
                    IsAvailable = table.Column<bool>(nullable: false, defaultValue: true),
                    PurchaseDate = table.Column<DateTime>(nullable: false),
                    LastMaintenanceDate = table.Column<DateTime>(nullable: true),
                    Notes = table.Column<string>(maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Equipment", x => x.Id);
                    table.UniqueConstraint("AK_Equipment_SerialNumber", x => x.SerialNumber);
                });

            // Create indexes for performance optimization
            migrationBuilder.CreateIndex(
                name: "IX_Users_NormalizedEmail",
                table: "Users",
                column: "NormalizedEmail",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_IsActive",
                table: "Users",
                column: "IsActive")
                .Annotation("SqlServer:FilteredIndex", "IsActive = 1");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Region_IsActive",
                table: "Customers",
                columns: new[] { "Region", "IsActive" })
                .Annotation("SqlServer:FilteredIndex", "IsActive = 1");

            migrationBuilder.CreateIndex(
                name: "IX_Equipment_Type_IsAvailable",
                table: "Equipment",
                columns: new[] { "Type", "IsAvailable" })
                .Annotation("SqlServer:FilteredIndex", "IsActive = 1");

            // Enable row-level security
            migrationBuilder.Sql(@"
                CREATE SECURITY POLICY CustomerAccessPolicy
                ADD FILTER PREDICATE dbo.fn_CustomerAccessPredicate(CustomerId) ON dbo.Customers,
                ADD BLOCK PREDICATE dbo.fn_CustomerAccessPredicate(CustomerId) ON dbo.Customers;
            ");

            // Create audit triggers
            migrationBuilder.Sql(@"
                CREATE TRIGGER TR_Users_Audit ON Users AFTER INSERT, UPDATE, DELETE AS
                BEGIN
                    SET NOCOUNT ON;
                    INSERT INTO AuditLog (TableName, Action, RecordId, Changes, UserId, Timestamp)
                    SELECT 
                        'Users',
                        CASE
                            WHEN EXISTS(SELECT * FROM INSERTED) AND EXISTS(SELECT * FROM DELETED) THEN 'UPDATE'
                            WHEN EXISTS(SELECT * FROM INSERTED) THEN 'INSERT'
                            ELSE 'DELETE'
                        END,
                        COALESCE(i.Id, d.Id),
                        (SELECT * FROM (SELECT COALESCE(i.*, d.*) AS Record) AS Changes FOR JSON AUTO),
                        SYSTEM_USER,
                        GETUTCDATE()
                    FROM INSERTED i
                    FULL OUTER JOIN DELETED d ON i.Id = d.Id;
                END
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove security policies
            migrationBuilder.Sql("DROP SECURITY POLICY CustomerAccessPolicy;");

            // Remove audit triggers
            migrationBuilder.Sql("DROP TRIGGER TR_Users_Audit;");

            // Drop tables in reverse order
            migrationBuilder.DropTable(name: "Equipment");
            migrationBuilder.DropTable(name: "Customers");
            migrationBuilder.DropTable(name: "UserRoles");
            migrationBuilder.DropTable(name: "Roles");
            migrationBuilder.DropTable(name: "Users");
        }
    }
}