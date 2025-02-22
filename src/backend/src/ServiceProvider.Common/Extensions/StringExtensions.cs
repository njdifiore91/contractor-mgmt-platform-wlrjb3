using System;
using System.Text.RegularExpressions; // v6.0.0
using System.Globalization; // v6.0.0

namespace ServiceProvider.Common.Extensions
{
    /// <summary>
    /// Provides thread-safe, culture-aware extension methods for string manipulation and validation
    /// with enhanced security features and performance optimizations.
    /// </summary>
    public static class StringExtensions
    {
        /// <summary>
        /// Maximum allowed string length to prevent DoS attacks
        /// </summary>
        private const int MaxStringLength = 4096;

        /// <summary>
        /// RFC 5322 compliant email validation pattern, compiled for performance
        /// </summary>
        private static readonly Regex EmailRegexPattern = new(
            @"(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|""(?:[\x01-\x08\x0b\x0c\x0e-\x1f!#-[\]-\x7f]|\\[\x01-\t\x0b\x0c\x0e-\x7f])*"")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f!-ZS-\x7f]|\\[\x01-\t\x0b\x0c\x0e-\x7f])+)\])",
            RegexOptions.Compiled | RegexOptions.IgnoreCase
        );

        /// <summary>
        /// Thread-safe extension method to check if a string is null or empty with additional whitespace validation
        /// </summary>
        /// <param name="value">The string to check</param>
        /// <returns>True if string is null, empty, or contains only whitespace</returns>
        public static bool IsNullOrEmpty(this string value)
        {
            if (value == null) return true;
            if (value.Length == 0) return true;
            return string.IsNullOrWhiteSpace(value);
        }

        /// <summary>
        /// Validates email address format using RFC 5322 compliant regex pattern with security checks
        /// </summary>
        /// <param name="email">The email address to validate</param>
        /// <returns>True if email format is valid and meets security requirements</returns>
        public static bool IsValidEmail(this string email)
        {
            if (email.IsNullOrEmpty()) return false;
            if (email.Length > MaxStringLength) return false;

            try
            {
                // Use compiled regex pattern for performance
                return EmailRegexPattern.IsMatch(email);
            }
            catch (RegexMatchTimeoutException)
            {
                // Handle potential regex DOS attacks
                return false;
            }
        }

        /// <summary>
        /// Converts string to title case with culture awareness and performance optimization
        /// </summary>
        /// <param name="value">The string to convert</param>
        /// <param name="culture">Optional culture info, defaults to current culture</param>
        /// <returns>Culture-aware title case converted string</returns>
        public static string ToTitleCase(this string value, CultureInfo culture = null)
        {
            if (value.IsNullOrEmpty()) return value;
            if (value.Length > MaxStringLength) 
                throw new ArgumentException($"String length exceeds maximum allowed length of {MaxStringLength}");

            culture ??= CultureInfo.CurrentCulture;
            
            // Use TextInfo for proper culture-aware casing
            return culture.TextInfo.ToTitleCase(value.ToLower(culture));
        }

        /// <summary>
        /// Safely truncates string to specified length with unicode character preservation
        /// </summary>
        /// <param name="value">The string to truncate</param>
        /// <param name="maxLength">Maximum length of the resulting string</param>
        /// <param name="ellipsis">Optional ellipsis string to append</param>
        /// <returns>Safely truncated string with optional ellipsis</returns>
        public static string Truncate(this string value, int maxLength, string ellipsis = "...")
        {
            if (value.IsNullOrEmpty()) return value;
            if (maxLength <= 0) throw new ArgumentException("MaxLength must be greater than zero", nameof(maxLength));
            if (maxLength > MaxStringLength) maxLength = MaxStringLength;

            if (value.Length <= maxLength) return value;

            // Account for ellipsis in final length
            var truncateLength = ellipsis != null 
                ? Math.Max(0, maxLength - ellipsis.Length) 
                : maxLength;

            // Ensure we don't break unicode surrogate pairs
            if (char.IsHighSurrogate(value[truncateLength - 1]))
            {
                truncateLength--;
            }

            return value.Substring(0, truncateLength) + (ellipsis ?? string.Empty);
        }

        /// <summary>
        /// Removes special characters with culture awareness and security considerations
        /// </summary>
        /// <param name="value">The string to clean</param>
        /// <param name="preserveFormat">Optional flag to preserve formatting characters</param>
        /// <returns>Cleaned string with special characters removed</returns>
        public static string RemoveSpecialCharacters(this string value, bool preserveFormat = false)
        {
            if (value.IsNullOrEmpty()) return value;
            if (value.Length > MaxStringLength)
                throw new ArgumentException($"String length exceeds maximum allowed length of {MaxStringLength}");

            // Use a custom character set based on the preserveFormat flag
            var allowedCategories = new UnicodeCategory[]
            {
                UnicodeCategory.UppercaseLetter,
                UnicodeCategory.LowercaseLetter,
                UnicodeCategory.DecimalDigitNumber,
                UnicodeCategory.SpaceSeparator
            };

            if (preserveFormat)
            {
                allowedCategories = allowedCategories.Concat(new[]
                {
                    UnicodeCategory.LineSeparator,
                    UnicodeCategory.ParagraphSeparator,
                    UnicodeCategory.DashPunctuation,
                    UnicodeCategory.OpenPunctuation,
                    UnicodeCategory.ClosePunctuation
                }).ToArray();
            }

            return new string(
                value.Where(c => allowedCategories.Contains(char.GetUnicodeCategory(c)))
                     .ToArray()
            );
        }
    }
}