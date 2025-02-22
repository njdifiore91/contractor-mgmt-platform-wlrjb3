using System;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace ServiceProvider.Core.Domain.Inspectors
{
    /// <summary>
    /// Represents a certification or qualification held by an inspector with comprehensive validation and audit trail.
    /// Implements secure tracking of certification status, expiry, and modifications with digital signature verification.
    /// </summary>
    public class Certification
    {
        private static readonly Regex CertificationNamePattern = new(@"^[A-Z0-9\s\-\.]{2,100}$", RegexOptions.Compiled);
        private static readonly Regex CertificationNumberPattern = new(@"^[A-Z0-9\-]{5,50}$", RegexOptions.Compiled);
        private const int MaxExpiryYears = 5;

        public int Id { get; private set; }
        public int InspectorId { get; private set; }
        public virtual Inspector Inspector { get; private set; }

        [Required]
        [StringLength(100)]
        public string Name { get; private set; }

        [Required]
        [StringLength(100)]
        public string IssuingAuthority { get; private set; }

        [Required]
        [StringLength(50)]
        public string CertificationNumber { get; private set; }

        public DateTime IssueDate { get; private set; }
        public DateTime ExpiryDate { get; private set; }
        public bool IsActive { get; private set; }
        public DateTime CreatedAt { get; private set; }

        [Required]
        [StringLength(50)]
        public string CreatedBy { get; private set; }

        public DateTime? ModifiedAt { get; private set; }

        [StringLength(50)]
        public string ModifiedBy { get; private set; }

        [StringLength(500)]
        public string ModificationReason { get; private set; }

        [Required]
        public string DigitalSignature { get; private set; }

        /// <summary>
        /// Creates a new certification instance with comprehensive validation.
        /// </summary>
        /// <param name="inspectorId">The ID of the inspector receiving the certification</param>
        /// <param name="name">The name of the certification</param>
        /// <param name="issuingAuthority">The authority that issued the certification</param>
        /// <param name="certificationNumber">The unique certification identifier</param>
        /// <param name="issueDate">The date when the certification was issued</param>
        /// <param name="expiryDate">The date when the certification expires</param>
        /// <param name="createdBy">The user creating the certification record</param>
        /// <exception cref="ArgumentException">Thrown when validation fails for any parameter</exception>
        public Certification(
            int inspectorId,
            string name,
            string issuingAuthority,
            string certificationNumber,
            DateTime issueDate,
            DateTime expiryDate,
            string createdBy)
        {
            if (inspectorId <= 0)
                throw new ArgumentException("Inspector ID must be greater than 0.", nameof(inspectorId));

            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Certification name cannot be empty.", nameof(name));
            if (!CertificationNamePattern.IsMatch(name))
                throw new ArgumentException("Invalid certification name format.", nameof(name));

            if (string.IsNullOrWhiteSpace(issuingAuthority))
                throw new ArgumentException("Issuing authority cannot be empty.", nameof(issuingAuthority));

            if (string.IsNullOrWhiteSpace(certificationNumber))
                throw new ArgumentException("Certification number cannot be empty.", nameof(certificationNumber));
            if (!CertificationNumberPattern.IsMatch(certificationNumber))
                throw new ArgumentException("Invalid certification number format.", nameof(certificationNumber));

            if (issueDate > DateTime.UtcNow)
                throw new ArgumentException("Issue date cannot be in the future.", nameof(issueDate));

            var minExpiryDate = issueDate.AddDays(1);
            var maxExpiryDate = DateTime.UtcNow.AddYears(MaxExpiryYears);
            if (expiryDate <= minExpiryDate || expiryDate > maxExpiryDate)
                throw new ArgumentException($"Expiry date must be between {minExpiryDate:d} and {maxExpiryDate:d}.", nameof(expiryDate));

            if (string.IsNullOrWhiteSpace(createdBy))
                throw new ArgumentException("Created by cannot be empty.", nameof(createdBy));

            InspectorId = inspectorId;
            Name = name;
            IssuingAuthority = issuingAuthority;
            CertificationNumber = certificationNumber;
            IssueDate = issueDate.Date;
            ExpiryDate = expiryDate.Date;
            IsActive = true;
            CreatedAt = DateTime.UtcNow;
            CreatedBy = createdBy;

            GenerateDigitalSignature();
        }

        /// <summary>
        /// Deactivates the certification with audit trail.
        /// </summary>
        /// <param name="deactivatedBy">User performing the deactivation</param>
        /// <param name="reason">Reason for deactivation</param>
        /// <exception cref="ArgumentException">Thrown when parameters are invalid</exception>
        /// <exception cref="InvalidOperationException">Thrown when certification is already inactive</exception>
        public void Deactivate(string deactivatedBy, string reason)
        {
            if (string.IsNullOrWhiteSpace(deactivatedBy))
                throw new ArgumentException("Deactivated by cannot be empty.", nameof(deactivatedBy));

            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Deactivation reason cannot be empty.", nameof(reason));

            if (!IsActive)
                throw new InvalidOperationException("Certification is already inactive.");

            IsActive = false;
            ModifiedAt = DateTime.UtcNow;
            ModifiedBy = deactivatedBy;
            ModificationReason = reason;

            GenerateDigitalSignature();
        }

        /// <summary>
        /// Updates the expiry date with validation and audit trail.
        /// </summary>
        /// <param name="newExpiryDate">New expiration date</param>
        /// <param name="modifiedBy">User performing the update</param>
        /// <param name="reason">Reason for the update</param>
        /// <exception cref="ArgumentException">Thrown when parameters are invalid</exception>
        /// <exception cref="InvalidOperationException">Thrown when certification is inactive</exception>
        public void UpdateExpiryDate(DateTime newExpiryDate, string modifiedBy, string reason)
        {
            if (!IsActive)
                throw new InvalidOperationException("Cannot update expiry date of inactive certification.");

            if (newExpiryDate <= IssueDate)
                throw new ArgumentException("New expiry date must be after issue date.", nameof(newExpiryDate));

            var maxExpiryDate = DateTime.UtcNow.AddYears(MaxExpiryYears);
            if (newExpiryDate > maxExpiryDate)
                throw new ArgumentException($"New expiry date cannot be more than {MaxExpiryYears} years from now.", nameof(newExpiryDate));

            if (string.IsNullOrWhiteSpace(modifiedBy))
                throw new ArgumentException("Modified by cannot be empty.", nameof(modifiedBy));

            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Modification reason cannot be empty.", nameof(reason));

            ExpiryDate = newExpiryDate.Date;
            ModifiedAt = DateTime.UtcNow;
            ModifiedBy = modifiedBy;
            ModificationReason = reason;

            GenerateDigitalSignature();
        }

        /// <summary>
        /// Checks if the certification has expired.
        /// </summary>
        /// <returns>True if the certification is expired or inactive, false otherwise</returns>
        public bool IsExpired()
        {
            if (!IsActive) return true;
            return DateTime.UtcNow.Date > ExpiryDate;
        }

        /// <summary>
        /// Generates a digital signature for the certification record to ensure data integrity.
        /// </summary>
        private void GenerateDigitalSignature()
        {
            using var sha256 = SHA256.Create();
            var dataToHash = $"{InspectorId}|{Name}|{IssuingAuthority}|{CertificationNumber}|" +
                           $"{IssueDate:s}|{ExpiryDate:s}|{IsActive}|{CreatedAt:s}|{CreatedBy}|" +
                           $"{ModifiedAt?.ToString("s") ?? "null"}|{ModifiedBy ?? "null"}|" +
                           $"{ModificationReason ?? "null"}";

            var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(dataToHash));
            DigitalSignature = Convert.ToBase64String(hashBytes);
        }

        // Protected constructor for EF Core
        protected Certification() { }
    }
}