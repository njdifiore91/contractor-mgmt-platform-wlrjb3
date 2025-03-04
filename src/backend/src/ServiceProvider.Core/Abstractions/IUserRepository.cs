using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ServiceProvider.Core.Domain.Users;

namespace ServiceProvider.Core.Abstractions
{


    //public class SearchUsersResult
    //{
    //    public SearchUsersResult(List<User> users, int totalCount, int pageNumber, int pageSize)
    //    {
    //        Users = users;
    //        TotalCount = totalCount;
    //        PageNumber = pageNumber;
    //        PageSize = pageSize;
    //    }

    //    public List<User> Users { get; }
    //    public int TotalCount { get; }
    //    public int PageNumber { get; }
    //    public int PageSize { get; }
    //}

    /// <summary>
    /// Represents the paginated result of a user search operation.
    /// </summary>
    public class SearchUsersResult
    {
        public IEnumerable<User> Users { get; }
        public int TotalCount { get; }
        public int PageNumber { get; }
        public int PageSize { get; }
        public int TotalPages { get; }

        public SearchUsersResult(
            IEnumerable<User> users,
            int totalCount,
            int pageNumber,
            int pageSize)
        {
            Users = users;
            TotalCount = totalCount;
            PageNumber = pageNumber;
            PageSize = pageSize;
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        }
    }
}
