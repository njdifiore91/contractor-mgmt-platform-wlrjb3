export interface ISearchParams {
  searchTerm?: string;
  isActive?: boolean;
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
