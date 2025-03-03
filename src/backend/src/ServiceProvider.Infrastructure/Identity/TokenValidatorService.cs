using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.IdentityModel.Tokens;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Users;

namespace ServiceProvider.Infrastructure.Identity
{
    public class TokenValidatorService : ITokenValidator
    {
        public async Task<ClaimsPrincipal> ValidateTokenAsync(string token, TokenValidationParameters tokenValidationParameters)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            try
            {
                var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out var validatedToken);
                return await Task.FromResult(principal);
            }
            catch (SecurityTokenException)
            {
                return await Task.FromResult<ClaimsPrincipal>(null);
            }
            catch (Exception)
            {
                return await Task.FromResult<ClaimsPrincipal>(null);
            }
        }

        public async Task<User> GetUserInfoAsync(string azureAdB2CId)
        {
            // Simulate fetching user info from a data source
            await Task.Delay(100); // Simulate async database call

            // Example user data
            var user = new User(
                email: "example@example.com",
                firstName: "John",
                lastName: "Doe",
                azureAdB2CId: azureAdB2CId
            );
            //{
            //    Id = 1,
            //    PhoneNumber = "+1234567890",
            //    IsActive = true,
            //    CreatedAt = DateTime.UtcNow,
            //    PreferredLanguage = "en-US",
            //    IsMfaEnabled = false
            //};

            return user;
        }
    }
}
