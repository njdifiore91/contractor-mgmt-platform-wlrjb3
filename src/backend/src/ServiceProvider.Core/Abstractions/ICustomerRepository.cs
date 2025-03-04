using System;
using ServiceProvider.Core.Domain.Customers;

namespace ServiceProvider.Core.Abstractions
{
    public interface ICustomerRepository
    {
        Task<Customer> GetByCodeAsync(string code);
        Task<bool> ValidateIndustryCodeAsync(string industry);
        Task<Customer> AddAsync(Customer customer);
    }
}
