using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using ServiceProvider.Core.Abstractions;
using ServiceProvider.Core.Domain.Users;
using ServiceProvider.Infrastructure.Data.Repositories;

namespace ServiceProvider.Services.Login.Commands
{
    public class LoginCommand : IRequest<AuthResponse>
    {
        public string Email { get; set; }
        public string Password { get; set; }

        public class Validator : AbstractValidator<LoginCommand>
        {
            public Validator()
            {
                RuleFor(x => x.Email).NotEmpty().EmailAddress();
                RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
            }
        }

        public class Handler : IRequestHandler<LoginCommand, AuthResponse>
        {
            private readonly IConfiguration _configuration;
            private readonly ILogger<Handler> _logger;
            private readonly IApplicationDbContext _context;

            public Handler(IApplicationDbContext context, IConfiguration configuration, ILogger<Handler> logger)
            {
                _context = context;
                _configuration = configuration;
                _logger = logger;
            }

            public async Task<AuthResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
            {
                var user = await _context.Users.Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role).Where(q => q.Email == request.Email && q.Password == request.Password).FirstOrDefaultAsync();
                if (user == null)
                {
                    _logger.LogWarning("Invalid login attempt for {Email}", request.Email);
                    return null;
                }

                var token = GenerateJwtToken(user);
                return new AuthResponse { Token = token, ExpiresIn = 7 * 24 * 60 * 60 };
            }

            private string GenerateJwtToken(User user)
            {
                var userRoles = String.Join(",", user.UserRoles.Select(q => q.Role.Name).ToList());
                var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Secret"]);
                var claims = new[]
                {
                new Claim(JwtRegisteredClaimNames.Sub, user.Email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim("FirstName", user.FirstName),
                new Claim("LastName", user.LastName),
                new Claim("role", userRoles)
            };

                var tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(claims),
                    Expires = DateTime.UtcNow.AddDays(7),
                    SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256)
                };

                var tokenHandler = new JwtSecurityTokenHandler();
                var token = tokenHandler.CreateToken(tokenDescriptor);
                return tokenHandler.WriteToken(token);
            }
        }

    }
    public class AuthResponse
    {
        public string Token { get; set; }
        public int ExpiresIn { get; set; } // In seconds
    }

}
