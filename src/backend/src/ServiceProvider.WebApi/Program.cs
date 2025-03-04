using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.ApplicationInsights;
using Microsoft.Identity.Web;
using Azure.Identity;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace ServiceProvider.WebApi
{
    /// <summary>
    /// Entry point for the ASP.NET Core Web API application with comprehensive security,
    /// monitoring, and environment-specific configurations.
    /// </summary>
    public class Program
    {
        /// <summary>
        /// Application entry point with enhanced error handling and monitoring
        /// </summary>
        public static async Task Main(string[] args)
        {
            try
            {
                // Configure thread pool for optimal performance
                ThreadPool.SetMinThreads(Environment.ProcessorCount * 4, Environment.ProcessorCount * 4);

                // Create and run the host
                var host = CreateHostBuilder(args).Build();

                // Initialize telemetry
                var telemetryClient = host.Services.GetService(typeof(TelemetryClient)) as TelemetryClient;
                telemetryClient?.TrackEvent("ApplicationStarting");

                await host.RunAsync();
            }
            catch (Exception ex)
            {
                // Log fatal errors during startup
                Console.Error.WriteLine($"Fatal error during application startup: {ex}");
                throw;
            }
        }

        /// <summary>
        /// Configures the web host builder with security, monitoring, and environment settings
        /// </summary>
        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureAppConfiguration((context, config) =>
                {
                    var env = context.HostingEnvironment;

                    config
                        .SetBasePath(context.HostingEnvironment.ContentRootPath)
                        .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                        .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true, reloadOnChange: true)
                        .AddEnvironmentVariables("SERVICEPROVIDER_");

                    // Add Azure Key Vault configuration in non-Development environments
                    if (!env.IsDevelopment())
                    {
                        var builtConfig = config.Build();
                        var keyVaultUri = builtConfig["KeyVault:Uri"];
                        
                        config.AddAzureKeyVault(
                            new Uri(keyVaultUri),
                            new DefaultAzureCredential(new DefaultAzureCredentialOptions
                            {
                                ExcludeEnvironmentCredential = env.IsDevelopment(),
                                ExcludeSharedTokenCacheCredential = true
                            }));
                    }

                    if (args != null)
                    {
                        config.AddCommandLine(args);
                    }
                })
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder
                        .UseStartup<Startup>()
                        .ConfigureKestrel(options =>
                        {
                            // Configure Kestrel with security headers and limits
                            options.AddServerHeader = false;
                            options.Limits.MaxConcurrentConnections = 100;
                            options.Limits.MaxRequestBodySize = 10 * 1024 * 1024; // 10MB
                            options.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(2);
                            options.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(30);
                        })
                        .UseIISIntegration();
                })
                .ConfigureLogging((context, logging) =>
                {
                    logging.ClearProviders();
                    logging.AddConsole();
                    logging.AddDebug();
                    logging.AddApplicationInsights();

                    // Configure logging levels
                    logging.SetMinimumLevel(
                        context.HostingEnvironment.IsDevelopment() 
                            ? LogLevel.Debug 
                            : LogLevel.Information);

                    // Add additional logging providers for production
                    if (!context.HostingEnvironment.IsDevelopment())
                    {
                        logging.AddEventLog();
                    }
                })
                .ConfigureServices((context, services) =>
                {
                    // Add Application Insights telemetry
                    services.AddApplicationInsightsTelemetry(options =>
                    {
                        options.EnableAdaptiveSampling = true;
                        options.EnableQuickPulseMetricStream = true;
                        options.EnableHeartbeat = true;
                        options.AddAutoCollectedMetricExtractor = true;
                    });

                    //// Add Azure AD B2C authentication
                    //services.AddMicrosoftIdentityWebApiAuthentication(
                    //    context.Configuration,
                    //    "AzureAdB2C",
                    //    subscribeToJwtBearerMiddlewareDiagnosticsEvents: true);
                });
    }
}
