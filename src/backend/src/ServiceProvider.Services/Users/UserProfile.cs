using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AutoMapper;
using ServiceProvider.Services.Users.Queries;
using ServiceProvider.Core.Domain.Users;

namespace ServiceProvider.Services.Users
{
    public class UserProfile : Profile
    {
        public UserProfile()
        {
            CreateMap<User, UserDto>()
                .ForMember(dest => dest.Roles, opt => opt.MapFrom(src => src.UserRoles.Select(ur => new UserRoleDto
                {
                    RoleId = ur.RoleId,
                    RoleName = ur.Role.Name,
                    AssignedAt = ur.AssignedAt
                })))
                .ForMember(dest => dest.Password, opt => opt.Ignore());
        }
    }
}
