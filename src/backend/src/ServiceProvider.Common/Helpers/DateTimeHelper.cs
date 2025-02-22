using System;
using System.Collections.Concurrent;
using ServiceProvider.Core.Abstractions;

namespace ServiceProvider.Common.Helpers
{
    /// <summary>
    /// Thread-safe static helper class providing comprehensive datetime utility functions.
    /// Implements IDateTimeService interface functionality with built-in validation,
    /// error handling, and performance optimizations through TimeZoneInfo caching.
    /// </summary>
    public static class DateTimeHelper
    {
        // Thread-safe cache for TimeZoneInfo objects to improve performance
        private static readonly ConcurrentDictionary<string, TimeZoneInfo> _timeZoneCache = 
            new ConcurrentDictionary<string, TimeZoneInfo>(StringComparer.OrdinalIgnoreCase);

        /// <summary>
        /// Gets the current UTC date and time with high precision.
        /// </summary>
        /// <returns>Current UTC datetime with high precision timestamp.</returns>
        public static DateTime GetCurrentUtcTime()
        {
            return DateTime.UtcNow;
        }

        /// <summary>
        /// Gets the current local time for a specified timezone with DST handling.
        /// </summary>
        /// <param name="timeZoneId">The system timezone identifier.</param>
        /// <returns>Current local time in specified timezone considering DST.</returns>
        /// <exception cref="ArgumentException">Thrown when timeZoneId is null or empty.</exception>
        /// <exception cref="TimeZoneNotFoundException">Thrown when timeZoneId is invalid.</exception>
        public static DateTime GetCurrentLocalTime(string timeZoneId)
        {
            if (string.IsNullOrWhiteSpace(timeZoneId))
            {
                throw new ArgumentException("Timezone ID cannot be null or empty.", nameof(timeZoneId));
            }

            var timeZone = _timeZoneCache.GetOrAdd(timeZoneId, id =>
            {
                try
                {
                    return TimeZoneInfo.FindSystemTimeZoneById(id);
                }
                catch (TimeZoneNotFoundException)
                {
                    throw new TimeZoneNotFoundException($"Timezone '{id}' was not found in the system.");
                }
            });

            return TimeZoneInfo.ConvertTimeFromUtc(GetCurrentUtcTime(), timeZone);
        }

        /// <summary>
        /// Converts local time to UTC with comprehensive validation and DST handling.
        /// </summary>
        /// <param name="localTime">The local datetime to convert.</param>
        /// <param name="timeZoneId">The system timezone identifier for the local time.</param>
        /// <returns>UTC datetime converted from local time with DST consideration.</returns>
        /// <exception cref="ArgumentException">Thrown when timeZoneId is null or empty.</exception>
        /// <exception cref="TimeZoneNotFoundException">Thrown when timeZoneId is invalid.</exception>
        public static DateTime ConvertToUtc(DateTime localTime, string timeZoneId)
        {
            if (string.IsNullOrWhiteSpace(timeZoneId))
            {
                throw new ArgumentException("Timezone ID cannot be null or empty.", nameof(timeZoneId));
            }

            var timeZone = _timeZoneCache.GetOrAdd(timeZoneId, id =>
            {
                try
                {
                    return TimeZoneInfo.FindSystemTimeZoneById(id);
                }
                catch (TimeZoneNotFoundException)
                {
                    throw new TimeZoneNotFoundException($"Timezone '{id}' was not found in the system.");
                }
            });

            // Handle ambiguous time during DST transition
            if (timeZone.IsAmbiguousTime(localTime))
            {
                // Use the earlier offset by default for ambiguous times
                var offsets = timeZone.GetAmbiguousTimeOffsets(localTime);
                return TimeZoneInfo.ConvertTimeToUtc(localTime, timeZone, offsets[0]);
            }

            // Handle invalid time during DST transition
            if (timeZone.IsInvalidTime(localTime))
            {
                throw new ArgumentException($"The time {localTime} is invalid in timezone {timeZoneId} due to DST transition.");
            }

            return TimeZoneInfo.ConvertTimeToUtc(localTime, timeZone);
        }

        /// <summary>
        /// Converts UTC time to local time with DST and edge case handling.
        /// </summary>
        /// <param name="utcTime">The UTC datetime to convert.</param>
        /// <param name="timeZoneId">The target timezone identifier for conversion.</param>
        /// <returns>Local datetime converted from UTC with proper DST handling.</returns>
        /// <exception cref="ArgumentException">Thrown when timeZoneId is null/empty or utcTime is not UTC.</exception>
        /// <exception cref="TimeZoneNotFoundException">Thrown when timeZoneId is invalid.</exception>
        public static DateTime ConvertToLocal(DateTime utcTime, string timeZoneId)
        {
            if (utcTime.Kind != DateTimeKind.Utc)
            {
                throw new ArgumentException("Input datetime must be in UTC.", nameof(utcTime));
            }

            if (string.IsNullOrWhiteSpace(timeZoneId))
            {
                throw new ArgumentException("Timezone ID cannot be null or empty.", nameof(timeZoneId));
            }

            var timeZone = _timeZoneCache.GetOrAdd(timeZoneId, id =>
            {
                try
                {
                    return TimeZoneInfo.FindSystemTimeZoneById(id);
                }
                catch (TimeZoneNotFoundException)
                {
                    throw new TimeZoneNotFoundException($"Timezone '{id}' was not found in the system.");
                }
            });

            return TimeZoneInfo.ConvertTimeFromUtc(utcTime, timeZone);
        }

        /// <summary>
        /// Gets the start of day (00:00:00.000) for a given date in UTC.
        /// </summary>
        /// <param name="date">The date to get the start of day for.</param>
        /// <returns>UTC datetime at start of the specified date.</returns>
        /// <exception cref="ArgumentException">Thrown when date is not UTC.</exception>
        public static DateTime GetStartOfDay(DateTime date)
        {
            if (date.Kind != DateTimeKind.Utc)
            {
                throw new ArgumentException("Input date must be in UTC.", nameof(date));
            }

            return new DateTime(date.Year, date.Month, date.Day, 0, 0, 0, 0, DateTimeKind.Utc);
        }

        /// <summary>
        /// Gets the end of day (23:59:59.999) for a given date in UTC.
        /// </summary>
        /// <param name="date">The date to get the end of day for.</param>
        /// <returns>UTC datetime at end of the specified date with millisecond precision.</returns>
        /// <exception cref="ArgumentException">Thrown when date is not UTC.</exception>
        public static DateTime GetEndOfDay(DateTime date)
        {
            if (date.Kind != DateTimeKind.Utc)
            {
                throw new ArgumentException("Input date must be in UTC.", nameof(date));
            }

            return new DateTime(date.Year, date.Month, date.Day, 23, 59, 59, 999, DateTimeKind.Utc);
        }

        /// <summary>
        /// Validates timezone ID with comprehensive error handling.
        /// </summary>
        /// <param name="timeZoneId">The timezone identifier to validate.</param>
        /// <returns>True if timezone ID is valid and available.</returns>
        public static bool IsValidTimeZone(string timeZoneId)
        {
            if (string.IsNullOrWhiteSpace(timeZoneId))
            {
                return false;
            }

            try
            {
                // Check cache first
                if (_timeZoneCache.TryGetValue(timeZoneId, out _))
                {
                    return true;
                }

                // If not in cache, try to find and cache it
                var timeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
                _timeZoneCache.TryAdd(timeZoneId, timeZone);
                return true;
            }
            catch (TimeZoneNotFoundException)
            {
                return false;
            }
            catch (Exception)
            {
                return false;
            }
        }
    }
}