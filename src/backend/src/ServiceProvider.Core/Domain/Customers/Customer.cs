using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace ServiceProvider.Core.Domain.Customers
{
    /// <summary>
    /// Represents a customer entity in the service provider management system.
    /// Implements comprehensive validation and security measures for managing customer information.
    /// </summary>
    public class Customer
    {
        #region Constants

        private const int MAX_CONTACTS = 10;
        private const int MAX_CONTRACTS = 50;
        private const string CODE_PATTERN = @"^[A-Z]{3}-\d{3}$";
        private const int MAX_NAME_LENGTH = 100;
        private const int MAX_ADDRESS_LENGTH = 200;
        private const int MAX_CITY_LENGTH = 100;

        #endregion

        #region Properties

        /// <summary>
        /// Gets the unique identifier for the customer.
        /// </summary>
        public int Id { get; private set; }

        /// <summary>
        /// Gets the unique business code for the customer.
        /// Format: XXX-000 (3 uppercase letters followed by 3 digits)
        /// </summary>
        public string Code { get; private set; }

        /// <summary>
        /// Gets the customer's business name.
        /// </summary>
        public string Name { get; private set; }

        /// <summary>
        /// Gets the customer's industry classification.
        /// </summary>
        public string Industry { get; private set; }

        /// <summary>
        /// Gets the customer's geographic region.
        /// </summary>
        public string Region { get; private set; }

        /// <summary>
        /// Gets the customer's street address.
        /// </summary>
        public string Address { get; private set; }

        /// <summary>
        /// Gets the customer's city.
        /// </summary>
        public string City { get; private set; }

        /// <summary>
        /// Gets the customer's state/province.
        /// </summary>
        public string State { get; private set; }

        /// <summary>
        /// Gets the customer's postal code.
        /// </summary>
        public string PostalCode { get; private set; }

        /// <summary>
        /// Gets the customer's country in ISO 3166-1 format.
        /// </summary>
        public string Country { get; private set; }

        /// <summary>
        /// Gets a value indicating whether the customer is active.
        /// </summary>
        public bool IsActive { get; private set; }

        /// <summary>
        /// Gets the UTC datetime when the customer was created.
        /// </summary>
        public DateTime CreatedAt { get; private set; }

        /// <summary>
        /// Gets the UTC datetime when the customer was last modified.
        /// </summary>
        public DateTime? ModifiedAt { get; private set; }

        /// <summary>
        /// Gets the collection of contacts associated with this customer.
        /// </summary>
        public ICollection<Contact> Contacts { get; private set; }

        /// <summary>
        /// Gets the collection of contract IDs associated with this customer.
        /// </summary>
        public ICollection<int> ContractIds { get; private set; }

        #endregion

        #region Constructor

        /// <summary>
        /// Initializes a new instance of the Customer class with required validation.
        /// </summary>
        /// <param name="code">The unique business code.</param>
        /// <param name="name">The business name.</param>
        /// <param name="industry">The industry classification.</param>
        /// <param name="region">The geographic region.</param>
        /// <exception cref="ArgumentException">Thrown when validation fails for any parameter.</exception>
        public Customer(string code, string name, string industry, string region)
        {
            ValidateCode(code);
            ValidateName(name);
            ValidateIndustry(industry);
            ValidateRegion(region);

            Code = code.ToUpperInvariant();
            Name = name.Trim();
            Industry = industry.Trim();
            Region = region.Trim();
            IsActive = true;
            CreatedAt = DateTime.UtcNow;
            Contacts = new HashSet<Contact>();
            ContractIds = new HashSet<int>();
        }

        #endregion

        #region Public Methods

        /// <summary>
        /// Updates the customer's details with comprehensive validation.
        /// </summary>
        /// <exception cref="ArgumentException">Thrown when validation fails for any parameter.</exception>
        public void UpdateDetails(string name, string industry, string region, 
            string address, string city, string state, string postalCode, string country)
        {
            ValidateName(name);
            ValidateIndustry(industry);
            ValidateRegion(region);
            ValidateAddress(address);
            ValidateCity(city);
            ValidateState(state);
            ValidatePostalCode(postalCode, country);
            ValidateCountry(country);

            Name = name.Trim();
            Industry = industry.Trim();
            Region = region.Trim();
            Address = address?.Trim();
            City = city?.Trim();
            State = state?.Trim();
            PostalCode = postalCode?.Trim();
            Country = country?.Trim().ToUpperInvariant();
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Adds a contact to the customer with validation.
        /// </summary>
        /// <param name="contact">The contact to add.</param>
        /// <exception cref="ArgumentException">Thrown when validation fails.</exception>
        /// <exception cref="InvalidOperationException">Thrown when maximum contacts limit is reached.</exception>
        public void AddContact(Contact contact)
        {
            if (contact == null)
            {
                throw new ArgumentNullException(nameof(contact));
            }

            if (Contacts.Count >= MAX_CONTACTS)
            {
                throw new InvalidOperationException($"Cannot exceed maximum of {MAX_CONTACTS} contacts.");
            }

            if (contact.CustomerId != Id)
            {
                throw new ArgumentException("Contact must belong to this customer.", nameof(contact));
            }

            ValidateContactEmailDomain(contact.Email);

            Contacts.Add(contact);
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Adds a contract ID to the customer with validation.
        /// </summary>
        /// <param name="contractId">The contract ID to add.</param>
        /// <exception cref="ArgumentException">Thrown when validation fails.</exception>
        /// <exception cref="InvalidOperationException">Thrown when maximum contracts limit is reached.</exception>
        public void AddContractId(int contractId)
        {
            if (contractId <= 0)
            {
                throw new ArgumentException("Contract ID must be greater than zero.", nameof(contractId));
            }

            if (ContractIds.Count >= MAX_CONTRACTS)
            {
                throw new InvalidOperationException($"Cannot exceed maximum of {MAX_CONTRACTS} contracts.");
            }

            ContractIds.Add(contractId);
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Removes a contract ID from the customer with validation.
        /// </summary>
        /// <param name="contractId">The contract ID to remove.</param>
        /// <exception cref="ArgumentException">Thrown when the contract ID doesn't exist.</exception>
        public void RemoveContractId(int contractId)
        {
            if (!ContractIds.Contains(contractId))
            {
                throw new ArgumentException("Contract ID not found.", nameof(contractId));
            }

            ContractIds.Remove(contractId);
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Deactivates the customer with validation.
        /// </summary>
        /// <exception cref="InvalidOperationException">Thrown when the customer cannot be deactivated.</exception>
        public void Deactivate()
        {
            if (ContractIds.Count > 0)
            {
                throw new InvalidOperationException("Cannot deactivate customer with active contracts.");
            }

            IsActive = false;
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Activates the customer with validation.
        /// </summary>
        /// <exception cref="InvalidOperationException">Thrown when the customer cannot be activated.</exception>
        public void Activate()
        {
            if (!Contacts.Exists(c => c.IsActive && c.IsPrimary))
            {
                throw new InvalidOperationException("Customer must have an active primary contact.");
            }

            IsActive = true;
            ModifiedAt = DateTime.UtcNow;
        }

        #endregion

        #region Private Methods

        private static void ValidateCode(string code)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                throw new ArgumentException("Code cannot be null or empty.", nameof(code));
            }

            if (!Regex.IsMatch(code, CODE_PATTERN))
            {
                throw new ArgumentException("Code must be in format XXX-000.", nameof(code));
            }
        }

        private static void ValidateName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ArgumentException("Name cannot be null or empty.", nameof(name));
            }

            if (name.Length > MAX_NAME_LENGTH)
            {
                throw new ArgumentException($"Name cannot exceed {MAX_NAME_LENGTH} characters.", nameof(name));
            }
        }

        private static void ValidateIndustry(string industry)
        {
            if (string.IsNullOrWhiteSpace(industry))
            {
                throw new ArgumentException("Industry cannot be null or empty.", nameof(industry));
            }

            // Additional industry code validation would be implemented here
        }

        private static void ValidateRegion(string region)
        {
            if (string.IsNullOrWhiteSpace(region))
            {
                throw new ArgumentException("Region cannot be null or empty.", nameof(region));
            }

            // Additional region code validation would be implemented here
        }

        private static void ValidateAddress(string address)
        {
            if (address != null && address.Length > MAX_ADDRESS_LENGTH)
            {
                throw new ArgumentException($"Address cannot exceed {MAX_ADDRESS_LENGTH} characters.", nameof(address));
            }
        }

        private static void ValidateCity(string city)
        {
            if (city != null && city.Length > MAX_CITY_LENGTH)
            {
                throw new ArgumentException($"City cannot exceed {MAX_CITY_LENGTH} characters.", nameof(city));
            }
        }

        private static void ValidateState(string state)
        {
            if (state != null)
            {
                // State/province code validation would be implemented here
            }
        }

        private static void ValidatePostalCode(string postalCode, string country)
        {
            if (postalCode != null && country != null)
            {
                // Postal code format validation per country would be implemented here
            }
        }

        private static void ValidateCountry(string country)
        {
            if (country != null)
            {
                // ISO 3166-1 country code validation would be implemented here
            }
        }

        private void ValidateContactEmailDomain(string email)
        {
            // Company email domain validation would be implemented here
        }

        #endregion
    }
}