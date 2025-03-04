using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Web;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Authentication;
using Microsoft.IdentityModel.Tokens;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Users;
using ServiceProvider.Common.Constants;

namespace ServiceProvider.Infrastructure.Identity
{
    /// <summary>
    /// Enhanced Azure AD B2C authentication service implementation with advanced security features
    /// including token validation, caching, and comprehensive audit logging.
    /// </summary>
    public class AzureAdB2CService : IDisposable
    {
        private readonly IConfiguration _configuration;
        private readonly ITokenValidator _tokenValidator;
        private readonly IMemoryCache _cache;
        private readonly ILogger<AzureAdB2CService> _logger;
        private readonly TokenValidationParameters _tokenValidationParameters;

        // Azure AD B2C Configuration
        private readonly string Instance;
        private readonly string Domain;
        private readonly string ClientId;
        private readonly string SignUpSignInPolicyId;
        private readonly string ResetPasswordPolicyId;
        private readonly string EditProfilePolicyId;

        // Cache keys and durations
        private const string USER_CACHE_KEY_PREFIX = "user_";
        private static readonly TimeSpan TOKEN_CACHE_DURATION = TimeSpan.FromMinutes(15);
        private static readonly TimeSpan USER_CACHE_DURATION = TimeSpan.FromMinutes(30);

        public AzureAdB2CService(
            IConfiguration configuration,
            ITokenValidator tokenValidator,
            IMemoryCache cache,
            ILogger<AzureAdB2CService> logger)
        {
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _tokenValidator = tokenValidator ?? throw new ArgumentNullException(nameof(tokenValidator));
            _cache = cache ?? throw new ArgumentNullException(nameof(cache));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            // Load and validate Azure AD B2C configuration
            Instance = _configuration["AzureAdB2C:Instance"] ?? throw new InvalidOperationException("Azure AD B2C Instance is not configured");
            Domain = _configuration["AzureAdB2C:Domain"] ?? throw new InvalidOperationException("Azure AD B2C Domain is not configured");
            ClientId = _configuration["AzureAdB2C:ClientId"] ?? throw new InvalidOperationException("Azure AD B2C ClientId is not configured");
            SignUpSignInPolicyId = _configuration["AzureAdB2C:SignUpSignInPolicyId"] ?? throw new InvalidOperationException("Sign-up/Sign-in policy is not configured");
            ResetPasswordPolicyId = _configuration["AzureAdB2C:ResetPasswordPolicyId"] ?? throw new InvalidOperationException("Reset password policy is not configured");
            EditProfilePolicyId = _configuration["AzureAdB2C:EditProfilePolicyId"] ?? throw new InvalidOperationException("Edit profile policy is not configured");

            // Configure token validation parameters with enhanced security
            _tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = $"{Instance}/{Domain}/{SignUpSignInPolicyId}/v2.0",
                ValidAudience = ClientId,
                ClockSkew = TimeSpan.FromMinutes(5),
                RequireExpirationTime = true,
                RequireSignedTokens = true
            };

            _logger.LogInformation("AzureAdB2CService initialized with enhanced security configuration");
        }

        /// <summary>
        /// Validates JWT token with comprehensive security checks and caching
        /// </summary>
        public async Task<ClaimsPrincipal> ValidateTokenAsync(string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                _logger.LogWarning("Token validation failed: Empty token");
                throw new ArgumentException("Token cannot be null or empty", nameof(token));
            }

            try
            {
                // Check cache first
                string cacheKey = $"token_{ComputeHash(token)}";
                if (_cache.TryGetValue(cacheKey, out ClaimsPrincipal cachedPrincipal))
                {
                    _logger.LogDebug("Token validation: Cache hit");
                    return cachedPrincipal;
                }

                // Validate token
                var tokenHandler = new JwtSecurityTokenHandler();
                if (!tokenHandler.CanReadToken(token))
                {
                    _logger.LogWarning("Token validation failed: Invalid token format");
                    throw new SecurityTokenException("Invalid token format");
                }

                var principal = await _tokenValidator.ValidateTokenAsync(token, _tokenValidationParameters);

                // Additional security checks
                ValidateTokenClaims(principal);

                // Cache the validated principal
                _cache.Set(cacheKey, principal, TOKEN_CACHE_DURATION);

                _logger.LogInformation("Token successfully validated for user {UserId}", 
                    principal.FindFirst(AuthorizationConstants.JwtClaimTypes_UserId)?.Value);

                return principal;
            }
            catch (SecurityTokenExpiredException ex)
            {
                _logger.LogWarning(ex, "Token validation failed: Token expired");
                throw;
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning(ex, "Token validation failed: Invalid token");
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token validation failed: Unexpected error");
                throw;
            }
        }

        /// <summary>
        /// Retrieves user information from Azure AD B2C with caching
        /// </summary>
        public async Task<User> GetUserInfoAsync(string azureAdB2CId)
        {
            if (string.IsNullOrEmpty(azureAdB2CId))
            {
                throw new ArgumentException("Azure AD B2C ID cannot be null or empty", nameof(azureAdB2CId));
            }

            string cacheKey = $"{USER_CACHE_KEY_PREFIX}{azureAdB2CId}";

            try
            {
                return await _cache.GetOrCreateAsync(cacheKey, async entry =>
                {
                    entry.SlidingExpiration = USER_CACHE_DURATION;

                    var userInfo = await _tokenValidator.GetUserInfoAsync(azureAdB2CId);
                    if (userInfo == null)
                    {
                        _logger.LogWarning("User not found in Azure AD B2C: {AzureAdB2CId}", azureAdB2CId);
                        throw new KeyNotFoundException($"User not found: {azureAdB2CId}");
                    }

                    _logger.LogInformation("User information retrieved for: {AzureAdB2CId}", azureAdB2CId);
                    return userInfo;
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve user information for: {AzureAdB2CId}", azureAdB2CId);
                throw;
            }
        }

        /// <summary>
        /// Creates authentication properties for Azure AD B2C with enhanced security
        /// </summary>
        public AuthenticationProperties CreateAuthenticationProperties(string redirectUri)
        {
            if (string.IsNullOrEmpty(redirectUri))
            {
                throw new ArgumentException("Redirect URI cannot be null or empty", nameof(redirectUri));
            }

            var properties = new AuthenticationProperties
            {
                RedirectUri = redirectUri,
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.Add(TOKEN_CACHE_DURATION),
                AllowRefresh = true
            };

            // Add security headers
            properties.Items["secure_headers"] = "true";
            properties.Items["x-frame-options"] = "DENY";
            properties.Items["x-content-type-options"] = "nosniff";
            properties.Items["referrer-policy"] = "strict-origin-when-cross-origin";

            _logger.LogDebug("Authentication properties created with enhanced security for redirect: {RedirectUri}", redirectUri);
            return properties;
        }

        private void ValidateTokenClaims(ClaimsPrincipal principal)
        {
            if (principal == null || !principal.Claims.Any())
            {
                throw new SecurityTokenException("Invalid token: No claims present");
            }

            var requiredClaims = new[]
            {
                AuthorizationConstants.JwtClaimTypes_UserId,
                AuthorizationConstants.JwtClaimTypes_Email,
                AuthorizationConstants.JwtClaimTypes_Role
            };

            foreach (var claim in requiredClaims)
            {
                if (!principal.HasClaim(c => c.Type == claim))
                {
                    _logger.LogWarning("Required claim missing in token: {Claim}", claim);
                    throw new SecurityTokenException($"Required claim missing: {claim}");
                }
            }
        }

        private string ComputeHash(string input)
        {
            using var sha = System.Security.Cryptography.SHA256.Create();
            var bytes = System.Text.Encoding.UTF8.GetBytes(input);
            var hash = sha.ComputeHash(bytes);
            return Convert.ToBase64String(hash);
        }

        public void Dispose()
        {
            // Cleanup any resources
            _cache.Dispose();
        }
    }
}
