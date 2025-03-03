using System;

namespace ServiceProvider.Common.Constants
{
    /// <summary>
    /// Provides standardized cache key generation methods for Redis cache operations
    /// with performance-optimized implementation.
    /// </summary>
    public static class CacheKeys
    {
        // Cache key prefixes for different entity types
        private const string USER_PREFIX = "user:";
        private const string CUSTOMER_PREFIX = "customer:";
        private const string INSPECTOR_PREFIX = "inspector:";
        private const string EQUIPMENT_PREFIX = "equipment:";
        private const string SESSION_PREFIX = "session:";

        // Private constructor to prevent instantiation
        static CacheKeys()
        {
            throw new InvalidOperationException($"{nameof(CacheKeys)} is a static utility class and should not be instantiated.");
        }

        /// <summary>
        /// Generates a cache key for user data with format 'user:{userId}'
        /// </summary>
        /// <param name="userId">The unique identifier for the user</param>
        /// <returns>A formatted cache key for user data access</returns>
        /// <exception cref="ArgumentNullException">Thrown when userId is null or empty</exception>
        public static string GetUserKey(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new ArgumentNullException(nameof(userId), "User ID cannot be null or empty");
            }
            return $"{USER_PREFIX}{userId}";
        }

        /// <summary>
        /// Generates a cache key for customer data with format 'customer:{customerId}'
        /// </summary>
        /// <param name="customerId">The unique identifier for the customer</param>
        /// <returns>A formatted cache key for customer data access</returns>
        /// <exception cref="ArgumentNullException">Thrown when customerId is null or empty</exception>
        public static string GetCustomerKey(string customerId)
        {
            if (string.IsNullOrEmpty(customerId))
            {
                throw new ArgumentNullException(nameof(customerId), "Customer ID cannot be null or empty");
            }
            return $"{CUSTOMER_PREFIX}{customerId}";
        }

        /// <summary>
        /// Generates a cache key for inspector data with format 'inspector:{inspectorId}'
        /// </summary>
        /// <param name="inspectorId">The unique identifier for the inspector</param>
        /// <returns>A formatted cache key for inspector data access</returns>
        /// <exception cref="ArgumentNullException">Thrown when inspectorId is null or empty</exception>
        public static string GetInspectorKey(string inspectorId)
        {
            if (string.IsNullOrEmpty(inspectorId))
            {
                throw new ArgumentNullException(nameof(inspectorId), "Inspector ID cannot be null or empty");
            }
            return $"{INSPECTOR_PREFIX}{inspectorId}";
        }

        /// <summary>
        /// Generates a cache key for equipment data with format 'equipment:{equipmentId}'
        /// </summary>
        /// <param name="equipmentId">The unique identifier for the equipment</param>
        /// <returns>A formatted cache key for equipment data access</returns>
        /// <exception cref="ArgumentNullException">Thrown when equipmentId is null or empty</exception>
        public static string GetEquipmentKey(string equipmentId)
        {
            if (string.IsNullOrEmpty(equipmentId))
            {
                throw new ArgumentNullException(nameof(equipmentId), "Equipment ID cannot be null or empty");
            }
            return $"{EQUIPMENT_PREFIX}{equipmentId}";
        }

        /// <summary>
        /// Generates a cache key for session data with format 'session:{sessionId}'
        /// </summary>
        /// <param name="sessionId">The unique identifier for the session</param>
        /// <returns>A formatted cache key for session data access</returns>
        /// <exception cref="ArgumentNullException">Thrown when sessionId is null or empty</exception>
        public static string GetSessionKey(string sessionId)
        {
            if (string.IsNullOrEmpty(sessionId))
            {
                throw new ArgumentNullException(nameof(sessionId), "Session ID cannot be null or empty");
            }
            return $"{SESSION_PREFIX}{sessionId}";
        }
    }
}
