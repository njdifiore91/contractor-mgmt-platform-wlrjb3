using System;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using ServiceProvider.Core.Domain.Audit;
using ServiceProvider.Core.Domain.Users;

namespace ServiceProvider.Core.Abstractions
{
    public interface IAuditTrailService
    {
        Task LogAsync(AuditLog auditEntry, CancellationToken cancellationToken);
    }
}
