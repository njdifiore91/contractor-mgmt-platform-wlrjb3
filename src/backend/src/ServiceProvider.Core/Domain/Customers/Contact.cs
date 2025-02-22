using System;

namespace ServiceProvider.Core.Domain.Customers
{
    /// <summary>
    /// Represents a contact entity for customers in the service provider management system.
    /// Implements comprehensive validation and state management for contact information.
    /// </summary>
    public class Contact
    {
        #region Properties

        /// <summary>
        /// Gets the unique identifier for the contact.
        /// </summary>
        public int Id { get; private set; }

        /// <summary>
        /// Gets the associated customer identifier.
        /// </summary>
        public int CustomerId { get; private set; }

        /// <summary>
        /// Gets the contact's first name.
        /// </summary>
        public string FirstName { get; private set; }

        /// <summary>
        /// Gets the contact's last name.
        /// </summary>
        public string LastName { get; private set; }

        /// <summary>
        /// Gets the contact's title or position.
        /// </summary>
        public string Title { get; private set; }

        /// <summary>
        /// Gets the contact's email address.
        /// </summary>
        public string Email { get; private set; }

        /// <summary>
        /// Gets the contact's phone number in E.164 format.
        /// </summary>
        public string PhoneNumber { get; private set; }

        /// <summary>
        /// Gets a value indicating whether this is the primary contact.
        /// </summary>
        public bool IsPrimary { get; private set; }

        /// <summary>
        /// Gets a value indicating whether the contact is active.
        /// </summary>
        public bool IsActive { get; private set; }

        /// <summary>
        /// Gets the UTC datetime when the contact was created.
        /// </summary>
        public DateTime CreatedAt { get; private set; }

        /// <summary>
        /// Gets the UTC datetime when the contact was last modified.
        /// </summary>
        public DateTime? ModifiedAt { get; private set; }

        #endregion

        #region Constructors

        /// <summary>
        /// Initializes a new instance of the Contact class with required validation.
        /// </summary>
        /// <param name="customerId">The associated customer identifier.</param>
        /// <param name="firstName">The contact's first name.</param>
        /// <param name="lastName">The contact's last name.</param>
        /// <param name="email">The contact's email address.</param>
        /// <exception cref="ArgumentException">Thrown when validation fails for any parameter.</exception>
        public Contact(int customerId, string firstName, string lastName, string email)
        {
            ValidateCustomerId(customerId);
            ValidateName(firstName, nameof(firstName));
            ValidateName(lastName, nameof(lastName));
            ValidateEmail(email);

            CustomerId = customerId;
            FirstName = firstName.Trim();
            LastName = lastName.Trim();
            Email = email.Trim().ToLowerInvariant();
            IsActive = true;
            IsPrimary = false;
            CreatedAt = DateTime.UtcNow;
        }

        #endregion

        #region Public Methods

        /// <summary>
        /// Updates the contact's details with comprehensive validation.
        /// </summary>
        /// <param name="firstName">The updated first name.</param>
        /// <param name="lastName">The updated last name.</param>
        /// <param name="title">The updated title.</param>
        /// <param name="email">The updated email address.</param>
        /// <param name="phoneNumber">The updated phone number.</param>
        /// <exception cref="ArgumentException">Thrown when validation fails for any parameter.</exception>
        public void UpdateDetails(string firstName, string lastName, string title, string email, string phoneNumber)
        {
            ValidateName(firstName, nameof(firstName));
            ValidateName(lastName, nameof(lastName));
            ValidateTitle(title);
            ValidateEmail(email);
            ValidatePhoneNumber(phoneNumber);

            FirstName = firstName.Trim();
            LastName = lastName.Trim();
            Title = title?.Trim();
            Email = email.Trim().ToLowerInvariant();
            PhoneNumber = FormatPhoneNumber(phoneNumber);
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Designates this contact as the primary contact.
        /// </summary>
        /// <exception cref="InvalidOperationException">Thrown when attempting to set an inactive contact as primary.</exception>
        public void SetPrimary()
        {
            if (!IsActive)
            {
                throw new InvalidOperationException("Cannot set an inactive contact as primary.");
            }

            IsPrimary = true;
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Removes primary contact designation.
        /// </summary>
        public void UnsetPrimary()
        {
            IsPrimary = false;
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Deactivates the contact with validation.
        /// </summary>
        /// <exception cref="InvalidOperationException">Thrown when the contact cannot be deactivated.</exception>
        public void Deactivate()
        {
            IsActive = false;
            if (IsPrimary)
            {
                UnsetPrimary();
            }
            ModifiedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Activates the contact.
        /// </summary>
        public void Activate()
        {
            IsActive = true;
            ModifiedAt = DateTime.UtcNow;
        }

        #endregion

        #region Private Methods

        private static void ValidateCustomerId(int customerId)
        {
            if (customerId <= 0)
            {
                throw new ArgumentException("Customer ID must be greater than zero.", nameof(customerId));
            }
        }

        private static void ValidateName(string name, string paramName)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ArgumentException("Name cannot be null or empty.", paramName);
            }

            if (name.Length > 100)
            {
                throw new ArgumentException("Name cannot exceed 100 characters.", paramName);
            }

            if (!System.Text.RegularExpressions.Regex.IsMatch(name, @"^[\p{L}\p{N}\s\-\'\.]+$"))
            {
                throw new ArgumentException("Name contains invalid characters.", paramName);
            }
        }

        private static void ValidateTitle(string title)
        {
            if (title != null)
            {
                if (title.Length > 100)
                {
                    throw new ArgumentException("Title cannot exceed 100 characters.", nameof(title));
                }
            }
        }

        private static void ValidateEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                throw new ArgumentException("Email cannot be null or empty.", nameof(email));
            }

            if (email.Length > 254)
            {
                throw new ArgumentException("Email cannot exceed 254 characters.", nameof(email));
            }

            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                if (addr.Address != email)
                {
                    throw new ArgumentException("Invalid email format.", nameof(email));
                }
            }
            catch
            {
                throw new ArgumentException("Invalid email format.", nameof(email));
            }
        }

        private static void ValidatePhoneNumber(string phoneNumber)
        {
            if (!string.IsNullOrWhiteSpace(phoneNumber))
            {
                if (!System.Text.RegularExpressions.Regex.IsMatch(phoneNumber, @"^\+?[1-9]\d{1,14}$"))
                {
                    throw new ArgumentException("Phone number must be in E.164 format.", nameof(phoneNumber));
                }
            }
        }

        private static string FormatPhoneNumber(string phoneNumber)
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
            {
                return null;
            }

            // Ensure number starts with + if not present
            return phoneNumber.StartsWith("+") ? phoneNumber : $"+{phoneNumber}";
        }

        #endregion
    }
}