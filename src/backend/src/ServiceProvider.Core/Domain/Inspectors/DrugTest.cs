using System;

namespace ServiceProvider.Core.Domain.Inspectors
{
    /// <summary>
    /// Represents a comprehensive drug test record with enhanced validation, security features, 
    /// and compliance tracking capabilities for inspector drug testing requirements.
    /// </summary>
    public class DrugTest
    {
        /// <summary>
        /// Gets the unique identifier for the drug test record.
        /// </summary>
        public int Id { get; private set; }

        /// <summary>
        /// Gets the identifier of the inspector who took the drug test.
        /// </summary>
        public int InspectorId { get; private set; }

        /// <summary>
        /// Gets the associated inspector entity.
        /// </summary>
        public virtual Inspector Inspector { get; private set; }

        /// <summary>
        /// Gets the UTC timestamp when the drug test was administered.
        /// </summary>
        public DateTime TestDate { get; private set; }

        /// <summary>
        /// Gets the type of drug test administered (e.g., "Standard Panel", "DOT Panel", "Extended Panel").
        /// </summary>
        public string TestType { get; private set; }

        /// <summary>
        /// Gets the unique identifier of the test kit used for this test.
        /// </summary>
        public string TestKitId { get; private set; }

        /// <summary>
        /// Gets the identifier of the authorized personnel who administered the test.
        /// </summary>
        public string AdministeredBy { get; private set; }

        /// <summary>
        /// Gets the test result. True indicates pass, false indicates fail.
        /// </summary>
        public bool? Result { get; private set; }

        /// <summary>
        /// Gets any additional notes or observations recorded during the test.
        /// </summary>
        public string Notes { get; private set; }

        /// <summary>
        /// Gets the UTC timestamp when the test record was created.
        /// </summary>
        public DateTime CreatedAt { get; private set; }

        /// <summary>
        /// Gets the UTC timestamp when the test record was last modified.
        /// </summary>
        public DateTime? ModifiedAt { get; private set; }

        /// <summary>
        /// Initializes a new instance of the DrugTest class with comprehensive validation.
        /// </summary>
        /// <param name="inspectorId">The ID of the inspector taking the test</param>
        /// <param name="testType">The type of drug test being administered</param>
        /// <param name="testKitId">The unique identifier of the test kit</param>
        /// <param name="administeredBy">The identifier of the test administrator</param>
        /// <exception cref="ArgumentException">Thrown when validation fails for any parameter</exception>
        public DrugTest(int inspectorId, string testType, string testKitId, string administeredBy)
        {
            if (inspectorId <= 0)
                throw new ArgumentException("Inspector ID must be greater than 0.", nameof(inspectorId));

            if (string.IsNullOrWhiteSpace(testType))
                throw new ArgumentException("Test type cannot be empty.", nameof(testType));

            if (string.IsNullOrWhiteSpace(testKitId))
                throw new ArgumentException("Test kit ID cannot be empty.", nameof(testKitId));

            if (string.IsNullOrWhiteSpace(administeredBy))
                throw new ArgumentException("Administrator identifier cannot be empty.", nameof(administeredBy));

            InspectorId = inspectorId;
            TestType = testType;
            TestKitId = testKitId;
            AdministeredBy = administeredBy;
            TestDate = DateTime.UtcNow;
            CreatedAt = DateTime.UtcNow;
            Result = null; // Result not yet recorded
        }

        /// <summary>
        /// Records the drug test result with validation and inspector notification.
        /// </summary>
        /// <param name="testResult">The test result (true for pass, false for fail)</param>
        /// <param name="notes">Optional notes about the test result</param>
        /// <exception cref="InvalidOperationException">Thrown when result has already been recorded</exception>
        public void RecordResult(bool testResult, string notes = null)
        {
            if (Result.HasValue)
                throw new InvalidOperationException("Test result has already been recorded.");

            Result = testResult;
            Notes = notes;
            ModifiedAt = DateTime.UtcNow;

            // Notify inspector entity of the test result
            Inspector?.RecordDrugTest(this);
        }

        /// <summary>
        /// Validates if the test result can be recorded based on the current state.
        /// </summary>
        /// <returns>True if result can be recorded, false otherwise.</returns>
        public bool CanRecordResult()
        {
            return !Result.HasValue && TestDate <= DateTime.UtcNow;
        }

        // Protected constructor for EF Core
        protected DrugTest() { }
    }
}