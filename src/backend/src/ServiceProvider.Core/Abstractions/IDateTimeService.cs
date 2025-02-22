using System;

namespace ServiceProvider.Core.Abstractions
{
    /// <summary>
    /// Provides core date and time service operations for consistent datetime handling across the application.
    /// Ensures reliable datetime management for audit trails, scheduling, and business operations.
    /// </summary>
    public interface IDateTimeService
    {
        /// <summary>
        /// Gets the current UTC date and time with high precision for system-wide consistency in timestamp recording.
        /// </summary>
        /// <returns>Current UTC datetime with millisecond precision.</returns>
        DateTime GetCurrentUtcTime();

        /// <summary>
        /// Gets the current local time for a specified timezone with DST handling.
        /// </summary>
        /// <param name="timeZoneId">The system timezone identifier (e.g., "America/New_York", "UTC").</param>
        /// <returns>Current local time in specified timezone with DST adjustment if applicable.</returns>
        /// <exception cref="ArgumentException">Thrown when timeZoneId is null, empty, or invalid.</exception>
        DateTime GetCurrentLocalTime(string timeZoneId);

        /// <summary>
        /// Converts local time to UTC considering timezone rules and DST.
        /// </summary>
        /// <param name="localTime">The local datetime to convert.</param>
        /// <param name="timeZoneId">The system timezone identifier for the local time.</param>
        /// <returns>UTC datetime converted from local time with DST consideration.</returns>
        /// <exception cref="ArgumentException">Thrown when timeZoneId is null, empty, or invalid.</exception>
        DateTime ConvertToUtc(DateTime localTime, string timeZoneId);

        /// <summary>
        /// Converts UTC time to local time with proper DST and timezone rule handling.
        /// </summary>
        /// <param name="utcTime">The UTC datetime to convert.</param>
        /// <param name="timeZoneId">The target timezone identifier for conversion.</param>
        /// <returns>Local datetime in specified timezone with DST adjustment.</returns>
        /// <exception cref="ArgumentException">Thrown when timeZoneId is null, empty, or invalid or utcTime is not UTC.</exception>
        DateTime ConvertToLocal(DateTime utcTime, string timeZoneId);

        /// <summary>
        /// Gets the start of day (00:00:00.000) for a given date in UTC.
        /// </summary>
        /// <param name="date">The date to get the start of day for.</param>
        /// <returns>UTC datetime at start of the specified date (midnight).</returns>
        /// <exception cref="ArgumentException">Thrown when date is not UTC.</exception>
        DateTime GetStartOfDay(DateTime date);

        /// <summary>
        /// Gets the end of day (23:59:59.999) for a given date in UTC.
        /// </summary>
        /// <param name="date">The date to get the end of day for.</param>
        /// <returns>UTC datetime at end of the specified date (23:59:59.999).</returns>
        /// <exception cref="ArgumentException">Thrown when date is not UTC.</exception>
        DateTime GetEndOfDay(DateTime date);

        /// <summary>
        /// Validates if the provided timezone ID exists in the system timezone database.
        /// </summary>
        /// <param name="timeZoneId">The timezone identifier to validate.</param>
        /// <returns>True if timezone ID is valid and available, false otherwise.</returns>
        bool IsValidTimeZone(string timeZoneId);
    }
}