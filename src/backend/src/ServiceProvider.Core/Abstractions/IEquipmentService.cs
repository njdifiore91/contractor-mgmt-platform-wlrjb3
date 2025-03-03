using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServiceProvider.Core.Abstractions
{
    public interface IEquipmentService
    {
        Task<bool> SerialNumberExistsAsync(string commandSerialNumber, CancellationToken cancellationToken);
    }
}
