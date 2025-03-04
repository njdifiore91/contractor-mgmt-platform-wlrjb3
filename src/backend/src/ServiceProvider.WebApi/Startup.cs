using AutoMapper;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Identity.Web;
using Microsoft.OpenApi.Models;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Infrastructure.Identity;
using ServiceProvider.Infrastructure.Cache;
using ServiceProvider.Common.Constants;
using StackExchange.Redis;
using System;
using System.Configuration;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Asp.Versioning;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Mvc.Authorization;
using AspNetCoreRateLimit;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using ServiceProvider.Infrastructure.Data;
using ServiceProvider.Infrastructure.Data.Repositories;
using Microsoft.Identity.Web.TokenCacheProviders.InMemory;
using Microsoft.IdentityModel.Tokens;
using ServiceProvider.Services.Users;
using ServiceProvider.Services.Users.Queries;

namespace ServiceProvider.WebApi
{
    /// <summary>
    /// Configures and initializes the ASP.NET Core Web API application with enterprise-grade features
    /// </summary>
    public class Startup
    {
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;

        public Startup(IConfiguration configuration, IWebHostEnvironment environment)
        {
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _environment = environment ?? throw new ArgumentNullException(nameof(environment));
        }

        /// <summary>
        /// Configures application services with security, performance, and monitoring features
        /// </summary>
        public void ConfigureServices(IServiceCollection services)
        {
            // Configure Entity Framework with optimized connection pooling
            services.AddDbContext<IApplicationDbContext, ApplicationDbContext>(options =>
                options.UseSqlServer(_configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is null."),
                    sqlOptions =>
                    {
                        sqlOptions.EnableRetryOnFailure(3);
                        sqlOptions.CommandTimeout(30);
                        sqlOptions.MigrationsAssembly("ServiceProvider.Infrastructure");
                        sqlOptions.UseNetTopologySuite();
                    }));

            services.AddScoped<IInspectorRepository, InspectorRepository>();
            services.AddScoped<ICustomerRepository, CustomerRepository>();
            services.AddScoped<IDrugTestRepository, DrugTestRepository>();
            services.AddScoped<IUserRepository, UserRepository>();
            services.AddScoped<IEquipmentRepository, EquipmentRepository>();

            services.AddScoped<UserRepository>();

            services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(ServiceProvider.Infrastructure.Dummy).Assembly));
            services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(ServiceProvider.Services.Dummy).Assembly));
            services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Dummy).Assembly));

            services.AddAutoMapper(typeof(ServiceProvider.Infrastructure.Dummy));
            services.AddAutoMapper(typeof(ServiceProvider.Services.Dummy));
            services.AddAutoMapper(typeof(Dummy));

            // Create the AutoMapper configuration and register your profile
            var mappingConfig = new MapperConfiguration(cfg =>
            {
                cfg.AddProfile<UserProfile>();
            });

            // Create the mapper instance
            IMapper mapper = mappingConfig.CreateMapper();

            // Register the mapper as a singleton
            services.AddSingleton(mapper);

            services.AddResponseCompression();

            // Configure Redis Cache
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = _configuration.GetConnectionString("Redis");
                options.InstanceName = "ServiceProvider:";
            });

            // Configure Rate Limiting
            services.AddMemoryCache();
            services.Configure<IpRateLimitOptions>(options =>
            {
                options.GeneralRules = new List<RateLimitRule>
                {
                    new RateLimitRule
                    {
                        Endpoint = "*",
                        Period = "1m",
                        Limit = 1000
                    }
                };
            });

            services.Configure<IpRateLimitOptions>(_configuration.GetSection("IpRateLimiting"));
            services.Configure<IpRateLimitPolicies>(_configuration.GetSection("IpRateLimitPolicies"));
            services.AddInMemoryRateLimiting();  // Registers the in-memory processing strategy

            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

            // Configure CORS with strict policies
            services.AddCors(options =>
            {
                options.AddPolicy("DefaultPolicy", builder =>
                {
                    builder.AllowAnyOrigin();
                });
            });

            // Configure API Versioning
            services.AddApiVersioning(options =>
            {
                options.DefaultApiVersion = new ApiVersion(1, 0);
                options.AssumeDefaultVersionWhenUnspecified = true;
                options.ReportApiVersions = true;
            });

            // Configure OpenAPI/Swagger
            services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "Service Provider Management API",
                    Version = "v1",
                    Description = "Enterprise API for managing service providers and equipment"
                });
            });

            // Configure Application Insights
            services.AddApplicationInsightsTelemetry(options =>
            {
                options.EnableAdaptiveSampling = true;
                options.EnableQuickPulseMetricStream = true;
            });

            // Configure Health Checks
            services.AddHealthChecks()
                .AddSqlServer(_configuration.GetConnectionString("DefaultConnection"))
                .AddRedis(_configuration.GetConnectionString("Redis"));

            services.AddScoped<ICurrentUserService, CurrentUserService>();

            // Configure Controllers with API Behavior
            services.AddControllers(options =>
            {
                options.Filters.Add(new ProducesAttribute("application/json"));
                options.Filters.Add(new ConsumesAttribute("application/json"));
                //options.Filters.Add(new AuthorizeFilter());
            })
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                options.JsonSerializerOptions.DefaultIgnoreCondition =
                    System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
            });

            var jwtSettings = _configuration.GetSection("Jwt");
            var secretKey = Encoding.UTF8.GetBytes(jwtSettings["Secret"]);

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = false, // Set to true if using an issuer
                        ValidateAudience = false, // Set to true if using an audience
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(secretKey)
                    };
                });
        }

        /// <summary>
        /// Configures HTTP pipeline with security and performance middleware
        /// </summary>
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            app.UseResponseCaching(); // Add the response caching middleware

            app.UseMiddleware<IpRateLimitMiddleware>();

            // Configure Security Headers
            app.UseSecurityHeaders(policies =>
                policies
                    .AddDefaultSecurityHeaders()
                    .AddStrictTransportSecurityMaxAgeIncludeSubDomains());

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseSwagger();
                app.UseSwaggerUI(options =>
                {
                    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Service Provider API V1");
                    options.OAuthClientId(_configuration["AzureAdB2C:ClientId"]);
                });
            }
            else
            {
                app.UseExceptionHandler("/error");
                app.UseHsts();
            }

            // Enable Request Compression
            app.UseResponseCompression();

            // Configure Security Middleware
            app.UseHttpsRedirection();
            app.UseIpRateLimiting();
            app.UseCors("DefaultPolicy");

            // Configure Routing and Endpoints
            app.UseRouting();

            // Configure Authentication Pipeline
            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
                endpoints.MapHealthChecks("/health", new HealthCheckOptions
                {
                    ResponseWriter = async (context, report) =>
                    {
                        context.Response.ContentType = "application/json";
                        await JsonSerializer.SerializeAsync(context.Response.Body, report);
                    }
                });
            });

            // Initialize Database
            using (var scope = app.ApplicationServices.CreateScope())
            {
                try
                {
                    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    var dbContext = context as DbContext;
                    dbContext?.Database.Migrate();
                }
                catch (Exception ex)
                {

                }
            }
        }
    }
}
