import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSchools } from "@/lib/school-actions";

const mockFetch = vi.fn();

describe("school actions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockFetch.mockReset();
  });

  it("fetches schools with search and location filters", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await fetchSchools({
      search: "Sunrise",
      location: "Nairobi",
      limit: 10,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/schools?search=Sunrise&location=Nairobi&limit=10",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
