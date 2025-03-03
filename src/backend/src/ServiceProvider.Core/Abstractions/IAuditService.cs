using System;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using ServiceProvider.Core.Domain.Audit;
using ServiceProvider.Core.Domain.Users;

namespace ServiceProvider.Core.Abstractions
{
    public interface IAuditService
    {
        Task LogAsync(AuditLog auditLog);
    }
}
