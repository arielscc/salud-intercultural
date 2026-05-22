import { describe, expect, it } from "vitest";
import { getOrderBy, getPagination, MAX_PAGE_SIZE } from "@/modules/database/pagination";

describe("pagination helpers", () => {
  it("uses stable defaults", () => {
    expect(getPagination()).toEqual({
      page: 1,
      pageSize: 12,
      skip: 0,
      take: 12
    });
  });

  it("clamps invalid pages and oversized page sizes", () => {
    expect(getPagination({ page: -3, pageSize: 500 })).toEqual({
      page: 1,
      pageSize: MAX_PAGE_SIZE,
      skip: 0,
      take: MAX_PAGE_SIZE
    });
  });

  it("creates typed order objects", () => {
    expect(getOrderBy("title", "desc")).toEqual({ title: "desc" });
  });
});
