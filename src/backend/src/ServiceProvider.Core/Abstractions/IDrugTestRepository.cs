using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ServiceProvider.Core.Domain.Inspectors;

namespace ServiceProvider.Core.Abstractions
{
    /// <summary>
    /// Interface defining data access operations for DrugTest entities.
    /// </summary>
    public interface IDrugTestRepository
    {
        Task<DrugTest> GetByIdAsync(int id, CancellationToken cancellationToken = default);
        Task<DrugTest> CreateAsync(DrugTest drugTest, CancellationToken cancellationToken = default);
        Task UpdateAsync(DrugTest drugTest, CancellationToken cancellationToken = default);
    }
}
