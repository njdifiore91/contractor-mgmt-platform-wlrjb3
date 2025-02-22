using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.ApplicationInsights.AspNetCore;
using Azure.Identity;
using ServiceProvider.ApiGateway;
using ServiceProvider.Common.Constants;
using System;
using System.Threading.Tasks;

public class Program
{
    public static async Task Main(string[] args)
    {
        try
        {
            var builder = WebApplication.CreateBuilder(args);

            // Configure host configuration
            ConfigureHostConfiguration(builder);

            // Configure logging
            ConfigureLogging(builder);

            // Configure Application Insights
            ConfigureApplicationInsights(builder);

            // Configure Azure Key Vault
            ConfigureKeyVault(builder);

            var app = builder.Build();

            var startup = new Startup(app.Configuration, app.Environment);
            startup.ConfigureServices(builder.Services);

            // Configure the HTTP request pipeline
            startup.Configure(app, app.Environment);

            // Configure graceful shutdown
            ConfigureGracefulShutdown(app);

            await app.RunAsync();
        }
        catch (Exception ex)
        {
            // Ensure unhandled exceptions are logged
            Log.Fatal(ex, "Host terminated unexpectedly");
            throw;
        }
    }

    private static void ConfigureHostConfiguration(WebApplicationBuilder builder)
    {
        builder.Configuration
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
            .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
            .AddEnvironmentVariables()
            .AddUserSecrets<Program>(optional: true);
    }

    private static void ConfigureLogging(WebApplicationBuilder builder)
    {
        builder.Logging.ClearProviders();

        builder.Logging.AddConsole();
        builder.Logging.AddDebug();
        builder.Logging.AddApplicationInsights();

        // Configure logging levels based on environment
        if (builder.Environment.IsDevelopment())
        {
            builder.Logging.SetMinimumLevel(LogLevel.Debug);
        }
        else
        {
            builder.Logging.SetMinimumLevel(LogLevel.Information);
        }

        // Add custom logging enrichers
        builder.Logging.AddFilter<ApplicationInsightsLoggerProvider>("Microsoft", LogLevel.Warning);
        builder.Logging.AddFilter<ApplicationInsightsLoggerProvider>("System", LogLevel.Warning);
    }

    private static void ConfigureApplicationInsights(WebApplicationBuilder builder)
    {
        builder.Services.AddApplicationInsightsTelemetry(options =>
        {
            options.ConnectionString = builder.Configuration[ConfigurationConstants.APP_INSIGHTS_KEY];
            options.EnableAdaptiveSampling = true;
            options.EnableQuickPulseMetricStream = true;
            options.EnableHeartbeat = true;
        });

        // Configure custom telemetry initializer
        builder.Services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();

        // Configure telemetry processor
        builder.Services.AddApplicationInsightsTelemetryProcessor<CustomTelemetryProcessor>();
    }

    private static void ConfigureKeyVault(WebApplicationBuilder builder)
    {
        var keyVaultUri = builder.Configuration[ConfigurationConstants.KEY_VAULT_URI_KEY];
        
        if (!string.IsNullOrEmpty(keyVaultUri))
        {
            builder.Configuration.AddAzureKeyVault(
                new Uri(keyVaultUri),
                new DefaultAzureCredential(new DefaultAzureCredentialOptions
                {
                    ManagedIdentityClientId = builder.Configuration[ConfigurationConstants.AZURE_AD_CLIENT_ID_KEY]
                }));
        }
    }

    private static void ConfigureGracefulShutdown(WebApplication app)
    {
        var lifetime = app.Services.GetRequiredService<IHostApplicationLifetime>();

        lifetime.ApplicationStarted.Register(() =>
        {
            app.Logger.LogInformation("API Gateway started successfully");
        });

        lifetime.ApplicationStopping.Register(() =>
        {
            app.Logger.LogInformation("API Gateway is stopping");
        });

        lifetime.ApplicationStopped.Register(() =>
        {
            app.Logger.LogInformation("API Gateway stopped");
        });
    }
}

/// <summary>
/// Custom telemetry initializer to add additional properties to all telemetry items
/// </summary>
public class CustomTelemetryInitializer : ITelemetryInitializer
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CustomTelemetryInitializer(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public void Initialize(ITelemetry telemetry)
    {
        var context = _httpContextAccessor.HttpContext;
        if (context != null)
        {
            telemetry.Context.Cloud.RoleName = "API Gateway";
            telemetry.Context.User.AuthenticatedUserId = context.User?.Identity?.Name;
            
            if (context.Request.Headers.TryGetValue("X-Correlation-ID", out var correlationId))
            {
                telemetry.Context.Operation.Id = correlationId;
            }
        }
    }
}

/// <summary>
/// Custom telemetry processor to filter out unwanted telemetry data
/// </summary>
public class CustomTelemetryProcessor : ITelemetryProcessor
{
    private readonly ITelemetryProcessor _next;

    public CustomTelemetryProcessor(ITelemetryProcessor next)
    {
        _next = next;
    }

    public void Process(ITelemetry item)
    {
        // Filter out health check requests from telemetry
        if (item is RequestTelemetry request &&
            request.Name.Contains("/health", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        _next.Process(item);
    }
}