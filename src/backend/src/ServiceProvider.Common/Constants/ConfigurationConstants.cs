namespace ServiceProvider.Common.Constants
{
    /// <summary>
    /// Provides centralized configuration constants for all system components and infrastructure services.
    /// These constants are used throughout the application to maintain consistency in configuration key names
    /// and default values for various services including database, cache, authentication, and external integrations.
    /// </summary>
    public static class ConfigurationConstants
    {
        #region Database Configuration

        /// <summary>
        /// Configuration key for the SQL Server connection string
        /// </summary>
        public const string SQL_CONNECTION_KEY = "ConnectionStrings:DefaultConnection";

        /// <summary>
        /// Default connection string for local development using SQL Server LocalDB
        /// </summary>
        public const string DEFAULT_SQL_CONNECTION = "Server=(localdb)\\mssqllocaldb;Database=ServiceProvider;Trusted_Connection=True";

        #endregion

        #region Cache Configuration

        /// <summary>
        /// Configuration key for the Redis cache connection string
        /// </summary>
        public const string REDIS_CONNECTION_KEY = "ConnectionStrings:RedisCache";

        /// <summary>
        /// Default connection string for local Redis cache instance
        /// </summary>
        public const string DEFAULT_REDIS_CONNECTION = "localhost:6379";

        #endregion

        #region Azure AD B2C Configuration

        /// <summary>
        /// Base URL for Azure AD authentication endpoint
        /// </summary>
        public const string AZURE_AD_INSTANCE = "https://login.microsoftonline.com/";

        /// <summary>
        /// Azure AD B2C domain name for the application
        /// </summary>
        public const string AZURE_AD_DOMAIN = "ServiceProviderB2C.onmicrosoft.com";

        /// <summary>
        /// Configuration key for Azure AD client ID
        /// </summary>
        public const string AZURE_AD_CLIENT_ID_KEY = "AzureAd:ClientId";

        /// <summary>
        /// Configuration key for Azure AD client secret
        /// </summary>
        public const string AZURE_AD_CLIENT_SECRET_KEY = "AzureAd:ClientSecret";

        /// <summary>
        /// Configuration key for Azure AD tenant ID
        /// </summary>
        public const string AZURE_AD_TENANT_ID_KEY = "AzureAd:TenantId";

        /// <summary>
        /// Configuration key for Azure AD B2C sign-up/sign-in policy
        /// </summary>
        public const string AZURE_AD_POLICY_KEY = "AzureAd:SignUpSignInPolicyId";

        #endregion

        #region OneDrive Configuration

        /// <summary>
        /// Configuration key for OneDrive connection string
        /// </summary>
        public const string ONEDRIVE_CONNECTION_KEY = "OneDrive:ConnectionString";

        /// <summary>
        /// Configuration key for OneDrive root folder path
        /// </summary>
        public const string ONEDRIVE_ROOT_FOLDER_KEY = "OneDrive:RootFolder";

        #endregion

        #region Email Service Configuration

        /// <summary>
        /// Configuration key for email service connection
        /// </summary>
        public const string EMAIL_SERVICE_KEY = "Email:ServiceConnection";

        /// <summary>
        /// Configuration key for email sender address
        /// </summary>
        public const string EMAIL_FROM_ADDRESS_KEY = "Email:FromAddress";

        #endregion

        #region Monitoring Configuration

        /// <summary>
        /// Configuration key for Application Insights connection string
        /// </summary>
        public const string APP_INSIGHTS_KEY = "ApplicationInsights:ConnectionString";

        #endregion

        #region Security Configuration

        /// <summary>
        /// Configuration key for CORS allowed origins
        /// </summary>
        public const string CORS_ORIGINS_KEY = "Cors:AllowedOrigins";

        /// <summary>
        /// Configuration key for Azure Key Vault URI
        /// </summary>
        public const string KEY_VAULT_URI_KEY = "KeyVault:Uri";

        #endregion

        #region Environment Configuration

        /// <summary>
        /// Configuration key for environment name
        /// </summary>
        public const string ENVIRONMENT_NAME_KEY = "Environment:Name";

        #endregion

        #region API Configuration

        /// <summary>
        /// Current API version
        /// </summary>
        public const string API_VERSION = "v1";

        #endregion
    }
}