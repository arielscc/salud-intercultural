export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

export type PaginationInput = {
  page?: number;
  pageSize?: number;
};

export type Pagination = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export type SortDirection = "asc" | "desc";

export function getPagination(input: PaginationInput = {}): Pagination {
  const page = Math.max(1, input.page ?? DEFAULT_PAGE);
  const pageSize = Math.min(Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize
  };
}

export function getOrderBy<TField extends string>(
  field: TField = "order" as TField,
  direction: SortDirection = "asc"
) {
  return { [field]: direction } as Record<TField, SortDirection>;
}
