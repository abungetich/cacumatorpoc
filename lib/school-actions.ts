import { apiFetch } from "@/lib/api-client";
import type { SchoolsResponse } from "@/lib/api-types";

type FetchSchoolsParams = {
  search?: string;
  location?: string;
  limit?: number;
};

export function fetchSchools({ search = "", location = "", limit = 20 }: FetchSchoolsParams = {}) {
  const params = new URLSearchParams();
  if (search.trim()) {
    params.set("search", search.trim());
  }
  if (location.trim()) {
    params.set("location", location.trim());
  }
  params.set("limit", String(limit));

  return apiFetch<SchoolsResponse>(`/api/protected/schools?${params.toString()}`);
}
