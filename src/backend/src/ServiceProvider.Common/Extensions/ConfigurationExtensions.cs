using System;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ServiceProvider.Common.Constants;

namespace ServiceProvider.Common.Extensions
{
    /// <summary>
    /// Provides extension methods for IConfiguration to enable strongly-typed access to configuration settings
    /// with enhanced validation, security handling, and environment-specific configuration management.
    /// </summary>
    public static class ConfigurationExtensions
    {
        private static readonly Regex ConnectionStringPattern = new(
            @"^(Data Source|Server|Address|Host)=.+;(Database|Initial Catalog)=.+;",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        /// <summary>
        /// Gets a required connection string from configuration with enhanced validation and security checks.
        /// </summary>
        /// <param name="configuration">The configuration instance.</param>
        /// <param name="name">The name of the connection string.</param>
        /// <returns>The validated connection string.</returns>
        /// <exception cref="ArgumentNullException">Thrown when configuration or name is null.</exception>
        /// <exception cref="ConfigurationException">Thrown when connection string is invalid or missing.</exception>
        public static string GetRequiredConnectionString(this IConfiguration configuration, string name)
        {
            if (configuration == null) throw new ArgumentNullException(nameof(configuration));
            if (string.IsNullOrWhiteSpace(name)) throw new ArgumentNullException(nameof(name));

            var connectionString = configuration.GetConnectionString(name);

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new ConfigurationException(
                    $"Required connection string '{name}' was not found in configuration.");
            }

            if (!ConnectionStringPattern.IsMatch(connectionString))
            {
                throw new ConfigurationException(
                    $"Connection string '{name}' has an invalid format. Required components are missing.");
            }

            return connectionString;
        }

        /// <summary>
        /// Gets a required configuration value with type validation and environment context.
        /// </summary>
        /// <typeparam name="T">The type of the configuration value.</typeparam>
        /// <param name="configuration">The configuration instance.</param>
        /// <param name="key">The configuration key.</param>
        /// <returns>The strongly-typed configuration value.</returns>
        /// <exception cref="ArgumentNullException">Thrown when configuration or key is null.</exception>
        /// <exception cref="ConfigurationException">Thrown when value is invalid or missing.</exception>
        public static T GetRequiredValue<T>(this IConfiguration configuration, string key)
        {
            if (configuration == null) throw new ArgumentNullException(nameof(configuration));
            if (string.IsNullOrWhiteSpace(key)) throw new ArgumentNullException(nameof(key));

            try
            {
                var value = configuration.GetValue<T>(key);

                if (value == null || (typeof(T) == typeof(string) && string.IsNullOrWhiteSpace(value as string)))
                {
                    throw new ConfigurationException(
                        $"Required configuration value '{key}' of type {typeof(T).Name} was not found.");
                }

                return value;
            }
            catch (InvalidOperationException ex)
            {
                throw new ConfigurationException(
                    $"Configuration value '{key}' could not be converted to type {typeof(T).Name}.", ex);
            }
        }

        /// <summary>
        /// Gets the Azure AD B2C configuration with enhanced security validation.
        /// </summary>
        /// <param name="configuration">The configuration instance.</param>
        /// <returns>A strongly-typed Azure AD configuration object.</returns>
        /// <exception cref="ArgumentNullException">Thrown when configuration is null.</exception>
        /// <exception cref="ConfigurationException">Thrown when Azure AD configuration is invalid or missing.</exception>
        public static AzureAdConfiguration GetAzureAdConfiguration(this IConfiguration configuration)
        {
            if (configuration == null) throw new ArgumentNullException(nameof(configuration));

            var azureAdSection = configuration.GetSection("AzureAd");

            if (!azureAdSection.Exists())
            {
                throw new ConfigurationException("Azure AD configuration section not found.");
            }

            var config = new AzureAdConfiguration
            {
                Instance = azureAdSection.GetValue<string>("Instance") ?? ConfigurationConstants.AZURE_AD_INSTANCE,
                Domain = azureAdSection.GetValue<string>("Domain") ?? ConfigurationConstants.AZURE_AD_DOMAIN,
                TenantId = azureAdSection.GetRequiredValue<string>(ConfigurationConstants.AZURE_AD_TENANT_ID_KEY),
                ClientId = azureAdSection.GetRequiredValue<string>(ConfigurationConstants.AZURE_AD_CLIENT_ID_KEY),
                ClientSecret = azureAdSection.GetRequiredValue<string>(ConfigurationConstants.AZURE_AD_CLIENT_SECRET_KEY),
                SignUpSignInPolicyId = azureAdSection.GetRequiredValue<string>(ConfigurationConstants.AZURE_AD_POLICY_KEY)
            };

            ValidateAzureAdConfiguration(config);

            return config;
        }

        private static void ValidateAzureAdConfiguration(AzureAdConfiguration config)
        {
            if (!Uri.TryCreate(config.Instance, UriKind.Absolute, out _))
            {
                throw new ConfigurationException("Azure AD Instance URL is invalid.");
            }

            if (string.IsNullOrWhiteSpace(config.Domain) || !config.Domain.Contains("."))
            {
                throw new ConfigurationException("Azure AD Domain is invalid.");
            }

            if (!Guid.TryParse(config.TenantId, out _))
            {
                throw new ConfigurationException("Azure AD Tenant ID must be a valid GUID.");
            }

            if (!Guid.TryParse(config.ClientId, out _))
            {
                throw new ConfigurationException("Azure AD Client ID must be a valid GUID.");
            }

            if (string.IsNullOrWhiteSpace(config.ClientSecret))
            {
                throw new ConfigurationException("Azure AD Client Secret cannot be empty.");
            }

            if (string.IsNullOrWhiteSpace(config.SignUpSignInPolicyId))
            {
                throw new ConfigurationException("Azure AD Sign-up/Sign-in Policy ID cannot be empty.");
            }
        }
    }

    /// <summary>
    /// Represents the Azure AD B2C configuration settings.
    /// </summary>
    public class AzureAdConfiguration
    {
        public string Instance { get; set; }
        public string Domain { get; set; }
        public string TenantId { get; set; }
        public string ClientId { get; set; }
        public string ClientSecret { get; set; }
        public string SignUpSignInPolicyId { get; set; }
    }
}