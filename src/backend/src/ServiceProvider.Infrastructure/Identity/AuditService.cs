using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Audit;
using ServiceProvider.Core.Domain.Customers;
using ServiceProvider.Infrastructure.Data;

namespace ServiceProvider.Infrastructure.Identity
{
    public class AuditService : IAuditService
    {
        private readonly ApplicationDbContext _context;

        public AuditService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task LogAsync(AuditLog auditLog)
        {
            // Create audit log entry
            var auditLogEntry = new AuditLog(
                entityName: auditLog.EntityName,
                entityId: auditLog.EntityId,
                action: auditLog.Action,
                changes: auditLog.Changes,
                ipAddress: auditLog.IpAddress,
                userId: auditLog.UserId
            );

            _context.AuditLogs.Add(auditLogEntry);
            await _context.SaveChangesAsync();
        }
    }
}
