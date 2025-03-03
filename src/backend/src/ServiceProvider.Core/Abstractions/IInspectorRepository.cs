using System;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Spatial;
using ServiceProvider.Core.Domain.Audit;
using ServiceProvider.Core.Domain.Equipment;
using ServiceProvider.Core.Domain.Inspectors;
using ServiceProvider.Core.Domain.Users;

namespace ServiceProvider.Core.Abstractions
{
    public interface IInspectorRepository
    {

        Task<Inspector> GetByIdAsync(int id, CancellationToken cancellationToken);
        Task<IEnumerable<Inspector>> SearchByLocationAsync(GeographyPoint requestLocation, double requestRadiusInMiles);
    }
}
