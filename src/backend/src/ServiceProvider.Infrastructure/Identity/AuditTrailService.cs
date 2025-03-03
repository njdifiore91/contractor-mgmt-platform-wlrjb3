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
    public class AuditTrailService : IAuditTrailService
    {
        private readonly ApplicationDbContext _context;

        public AuditTrailService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task LogAsync(AuditLog auditEntry, CancellationToken cancellationToken)
        {
            _context.AuditLogs.Add(auditEntry);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
