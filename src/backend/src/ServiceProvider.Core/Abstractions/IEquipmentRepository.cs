using System;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.IdentityModel.Tokens;
using ServiceProvider.Core.Domain.Audit;
using ServiceProvider.Core.Domain.Equipment;
using ServiceProvider.Core.Domain.Users;

namespace ServiceProvider.Core.Abstractions
{
    public interface IEquipmentRepository
    {
        Task<Equipment> GetByIdAsync(int id, CancellationToken cancellationToken = default);
        Task<Equipment> GetBySerialNumberAsync(string serialNumber, CancellationToken cancellationToken = default);

        Task<(List<Equipment> Items, int TotalCount)> GetAvailableEquipmentAsync(
            int pageSize = 20,
            int pageNumber = 1,
            CancellationToken cancellationToken = default);

        Task<EquipmentAssignment> AssignToInspectorAsync(
            int equipmentId,
            int inspectorId,
            string condition,
            CancellationToken cancellationToken = default);

        Task ProcessReturnAsync(
            int equipmentId,
            string condition,
            string notes = null,
            CancellationToken cancellationToken = default);

        Task RecordMaintenanceAsync(
            int equipmentId,
            string description,
            CancellationToken cancellationToken = default);

        Task<bool> CheckConcurrentAssignmentAsync(int commandEquipmentId, CancellationToken cancellationToken);
        Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken);
    }
}
