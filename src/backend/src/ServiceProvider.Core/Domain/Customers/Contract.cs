using System;

namespace ServiceProvider.Core.Domain.Customers
{
    /// <summary>
    /// Represents a customer contract entity with comprehensive validation, lifecycle management, and audit tracking capabilities.
    /// </summary>
    public class Contract
    {
        #region Constants

        private const decimal MIN_CONTRACT_VALUE = 0.01M;
        private const decimal MAX_CONTRACT_VALUE = 10000000M;
        private const string CONTRACT_NUMBER_PATTERN = @"^SVC-\d{4}-\d{2}$";
        private const int MAX_DESCRIPTION_LENGTH = 500;
        private const int MAX_RENEWAL_YEARS = 5;

        #endregion

        #region Properties

        /// <summary>
        /// Gets the unique identifier for the contract.
        /// </summary>
        public int Id { get; private set; }

        /// <summary>
        /// Gets the unique contract number in format SVC-YYYY-NN.
        /// </summary>
        public string ContractNumber { get; private set; }

        /// <summary>
        /// Gets the associated customer identifier.
        /// </summary>
        public int CustomerId { get; private set; }

        /// <summary>
        /// Gets the contract description.
        /// </summary>
        public string Description { get; private set; }

        /// <summary>
        /// Gets the contract value.
        /// </summary>
        public decimal Value { get; private set; }

        /// <summary>
        /// Gets the contract start date in UTC.
        /// </summary>
        public DateTime StartDate { get; private set; }

        /// <summary>
        /// Gets the contract end date in UTC.
        /// </summary>
        public DateTime EndDate { get; private set; }

        /// <summary>
        /// Gets the contract status (Active, Renewed, Terminated).
        /// </summary>
        public string Status { get; private set; }

        /// <summary>
        /// Gets a value indicating whether the contract is active.
        /// </summary>
        public bool IsActive { get; private set; }

        /// <summary>
        /// Gets the UTC datetime when the contract was created.
        /// </summary>
        public DateTime CreatedAt { get; private set; }

        /// <summary>
        /// Gets the UTC datetime when the contract was last modified.
        /// </summary>
        public DateTime? ModifiedAt { get; private set; }

        #endregion

        #region Constructor

        /// <summary>
        /// Initializes a new instance of the Contract class with comprehensive validation.
        /// </summary>
        /// <param name="contractNumber">The unique contract number.</param>
        /// <param name="customerId">The associated customer identifier.</param>
        /// <param name="description">The contract description.</param>
        /// <param name="value">The contract value.</param>
        /// <param name="startDate">The contract start date.</param>
        /// <param name="endDate">The contract end date.</param>
        /// <exception cref="ArgumentException">Thrown when validation fails for any parameter.</exception>
        public Contract(string contractNumber, int customerId, string description, decimal value, DateTime startDate, DateTime endDate)
        {
            ValidateContractNumber(contractNumber);
            ValidateCustomerId(customerId);
            ValidateDescription(description);
            ValidateValue(value);
            ValidateStartDate(startDate);
            ValidateEndDate(startDate, endDate);

            ContractNumber = contractNumber.ToUpperInvariant();
            CustomerId = customerId;
            Description = description.Trim();
            Value = decimal.Round(value, 2);
            StartDate = startDate.ToUniversalTime();
            EndDate = endDate.ToUniversalTime();
            Status = "Active";
            IsActive = true;
            CreatedAt = DateTime.UtcNow;
        }

        #endregion

        #region Public Methods

        /// <summary>
        /// Updates the contract details with validation and audit tracking.
        /// </summary>
        /// <param name="description">The updated description.</param>
        /// <param name="value">The updated value.</param>
        /// <param name="endDate">The updated end date.</param>
        /// <exception cref="InvalidOperationException">Thrown when contract is not active.</exception>
        /// <exception cref="ArgumentException">Thrown when validation fails for any parameter.</exception>
        public void UpdateDetails(string description, decimal value, DateTime endDate)
        {
            if (!IsActive)
            {
                throw new InvalidOperationException("Cannot update an inactive contract.");
            }

            ValidateDescription(description);
            ValidateValue(value);
            ValidateEndDate(StartDate, endDate);

            Description = description.Trim();
            Value = decimal.Round(value, 2);
            EndDate = endDate.ToUniversalTime();
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Terminates the contract with audit tracking.
        /// </summary>
        /// <exception cref="InvalidOperationException">Thrown when contract is not active.</exception>
        public void Terminate()
        {
            if (!IsActive)
            {
                throw new InvalidOperationException("Contract is already inactive.");
            }

            Status = "Terminated";
            IsActive = false;
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Renews the contract with new end date and validation.
        /// </summary>
        /// <param name="newEndDate">The new contract end date.</param>
        /// <exception cref="InvalidOperationException">Thrown when contract is not active.</exception>
        /// <exception cref="ArgumentException">Thrown when validation fails for the new end date.</exception>
        public void Renew(DateTime newEndDate)
        {
            if (!IsActive)
            {
                throw new InvalidOperationException("Cannot renew an inactive contract.");
            }

            var maxRenewalDate = EndDate.AddYears(MAX_RENEWAL_YEARS);
            if (newEndDate > maxRenewalDate)
            {
                throw new ArgumentException($"Renewal cannot exceed {MAX_RENEWAL_YEARS} years from current end date.", nameof(newEndDate));
            }

            if (newEndDate <= EndDate)
            {
                throw new ArgumentException("New end date must be after current end date.", nameof(newEndDate));
            }

            EndDate = newEndDate.ToUniversalTime();
            Status = "Renewed";
            ModifiedAt = DateTime.UtcNow;
        }

        #endregion

        #region Private Methods

        private static void ValidateContractNumber(string contractNumber)
        {
            if (string.IsNullOrWhiteSpace(contractNumber))
            {
                throw new ArgumentException("Contract number cannot be null or empty.", nameof(contractNumber));
            }

            if (!System.Text.RegularExpressions.Regex.IsMatch(contractNumber, CONTRACT_NUMBER_PATTERN))
            {
                throw new ArgumentException("Contract number must be in format SVC-YYYY-NN.", nameof(contractNumber));
            }
        }

        private static void ValidateCustomerId(int customerId)
        {
            if (customerId <= 0)
            {
                throw new ArgumentException("Customer ID must be greater than zero.", nameof(customerId));
            }
        }

        private static void ValidateDescription(string description)
        {
            if (string.IsNullOrWhiteSpace(description))
            {
                throw new ArgumentException("Description cannot be null or empty.", nameof(description));
            }

            if (description.Length > MAX_DESCRIPTION_LENGTH)
            {
                throw new ArgumentException($"Description cannot exceed {MAX_DESCRIPTION_LENGTH} characters.", nameof(description));
            }
        }

        private static void ValidateValue(decimal value)
        {
            if (value < MIN_CONTRACT_VALUE || value > MAX_CONTRACT_VALUE)
            {
                throw new ArgumentException($"Value must be between {MIN_CONTRACT_VALUE:C} and {MAX_CONTRACT_VALUE:C}.", nameof(value));
            }
        }

        private static void ValidateStartDate(DateTime startDate)
        {
            if (startDate.Kind != DateTimeKind.Utc)
            {
                startDate = startDate.ToUniversalTime();
            }

            if (startDate.Date < DateTime.UtcNow.Date)
            {
                throw new ArgumentException("Start date cannot be in the past.", nameof(startDate));
            }
        }

        private static void ValidateEndDate(DateTime startDate, DateTime endDate)
        {
            if (endDate.Kind != DateTimeKind.Utc)
            {
                endDate = endDate.ToUniversalTime();
            }

            if (endDate <= startDate)
            {
                throw new ArgumentException("End date must be after start date.", nameof(endDate));
            }
        }

        #endregion
    }
}