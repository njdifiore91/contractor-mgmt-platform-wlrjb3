using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using AspNetCoreRateLimit;
using Yarp.ReverseProxy.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using ServiceProvider.Common.Constants;
using System;
using System.Threading.Tasks;

namespace ServiceProvider.ApiGateway
{
    public class Startup
    {
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;

        public Startup(IConfiguration configuration, IWebHostEnvironment environment)
        {
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _environment = environment ?? throw new ArgumentNullException(nameof(environment));
        }

        public void ConfigureServices(IServiceCollection services)
        {
            // Configure CORS
            services.AddCors(options =>
            {
                options.AddDefaultPolicy(builder =>
                {
                    builder.WithOrigins(_configuration.GetSection(ConfigurationConstants.CORS_ORIGINS_KEY).Get<string[]>())
                           .AllowAnyMethod()
                           .AllowAnyHeader()
                           .AllowCredentials();
                });
            });

            // Configure Azure AD B2C Authentication
            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.Authority = $"{ConfigurationConstants.AZURE_AD_INSTANCE}{_configuration[ConfigurationConstants.AZURE_AD_TENANT_ID_KEY]}";
                    options.Audience = _configuration[ConfigurationConstants.AZURE_AD_CLIENT_ID_KEY];
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ClockSkew = TimeSpan.FromMinutes(5)
                    };
                    options.Events = new JwtBearerEvents
                    {
                        OnAuthenticationFailed = context =>
                        {
                            context.Response.StatusCode = 401;
                            return Task.CompletedTask;
                        }
                    };
                });

            // Configure Rate Limiting
            services.AddMemoryCache();
            services.Configure<IpRateLimitOptions>(_configuration.GetSection("IpRateLimit"));
            services.Configure<IpRateLimitPolicies>(_configuration.GetSection("IpRateLimitPolicies"));
            services.AddInMemoryRateLimiting();
            services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

            // Configure Redis Cache
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = _configuration[ConfigurationConstants.REDIS_CONNECTION_KEY];
                options.InstanceName = "ServiceProviderGateway_";
            });

            // Configure YARP Reverse Proxy
            services.AddReverseProxy()
                .LoadFromConfig(_configuration.GetSection("ReverseProxy"))
                .AddTransforms<ResponseTransform>();

            // Configure Health Checks
            services.AddHealthChecks()
                .AddRedis(_configuration[ConfigurationConstants.REDIS_CONNECTION_KEY], 
                    name: "redis-check", 
                    failureStatus: HealthStatus.Degraded)
                .AddUrlGroup(new Uri(_configuration["UserService:BaseUrl"]), 
                    name: "user-service-check")
                .AddUrlGroup(new Uri(_configuration["CustomerService:BaseUrl"]), 
                    name: "customer-service-check")
                .AddUrlGroup(new Uri(_configuration["InspectorService:BaseUrl"]), 
                    name: "inspector-service-check")
                .AddUrlGroup(new Uri(_configuration["EquipmentService:BaseUrl"]), 
                    name: "equipment-service-check");

            // Configure Application Insights
            services.AddApplicationInsightsTelemetry(options =>
            {
                options.ConnectionString = _configuration[ConfigurationConstants.APP_INSIGHTS_KEY];
                options.EnableAdaptiveSampling = true;
                options.EnableQuickPulseMetricStream = true;
            });

            // Add API Versioning
            services.AddApiVersioning(options =>
            {
                options.DefaultApiVersion = new Microsoft.AspNetCore.Mvc.ApiVersion(1, 0);
                options.AssumeDefaultVersionWhenUnspecified = true;
                options.ReportApiVersions = true;
            });

            // Configure Circuit Breaker
            services.AddHttpClient("default")
                .AddPolicyHandler(GetCircuitBreakerPolicy());
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Error");
                app.UseHsts();
            }

            app.UseHttpsRedirection();

            // Enable CORS
            app.UseCors();

            // Configure Security Headers
            app.Use(async (context, next) =>
            {
                context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
                context.Response.Headers.Add("X-Frame-Options", "DENY");
                context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
                context.Response.Headers.Add("Referrer-Policy", "strict-origin-when-cross-origin");
                await next();
            });

            // Enable Rate Limiting
            app.UseIpRateLimiting();

            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();

            // Health Checks
            app.UseHealthChecks("/health", new HealthCheckOptions
            {
                ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
            });

            // Enable Response Caching
            app.UseResponseCaching();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapReverseProxy(proxyPipeline =>
                {
                    proxyPipeline.UseSessionAffinity();
                    proxyPipeline.UseLoadBalancing();
                    proxyPipeline.UsePassiveHealthChecks();
                });

                endpoints.MapHealthChecks("/health/ready", new HealthCheckOptions
                {
                    Predicate = check => check.Tags.Contains("ready"),
                });

                endpoints.MapHealthChecks("/health/live", new HealthCheckOptions
                {
                    Predicate = _ => false,
                });
            });
        }

        private static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy()
        {
            return HttpPolicyExtensions
                .HandleTransientHttpError()
                .CircuitBreakerAsync(
                    handledEventsAllowedBeforeBreaking: 5,
                    durationOfBreak: TimeSpan.FromSeconds(30)
                );
        }
    }

    public class ResponseTransform : ITransform
    {
        public async ValueTask ApplyAsync(ResponseTransformContext context)
        {
            if (context.Response != null)
            {
                context.Response.Headers.Add("X-Powered-By", "Service Provider Gateway");
                context.Response.Headers.Add("X-Content-Security-Policy", "default-src 'self'");
            }
        }
    }
}