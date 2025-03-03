using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Infrastructure.Data;

namespace ServiceProvider.Infrastructure.Misc
{
    public class EquipmentService : IEquipmentService
    {
        private readonly ApplicationDbContext _context;

        public EquipmentService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> SerialNumberExistsAsync(string commandSerialNumber, CancellationToken cancellationToken)
        {
            return await _context.Equipment
                .AnyAsync(e => e.SerialNumber == commandSerialNumber, cancellationToken);
        }
    }
}
