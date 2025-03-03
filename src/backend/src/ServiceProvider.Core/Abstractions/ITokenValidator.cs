using System;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using ServiceProvider.Core.Domain.Users;

namespace ServiceProvider.Core.Abstractions
{
    public interface ITokenValidator
    {
        Task<ClaimsPrincipal> ValidateTokenAsync(string token, TokenValidationParameters tokenValidationParameters);
        Task<User> GetUserInfoAsync(string azureAdB2CId);
    }
}
