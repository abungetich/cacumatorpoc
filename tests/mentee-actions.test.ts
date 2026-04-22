import { afterEach, describe, expect, it, vi } from "vitest";
import { createMenteeRecord, fetchMentees, flagMenteeRecord } from "@/lib/mentee-actions";

const mockFetch = vi.fn();

describe("mentee actions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockFetch.mockReset();
  });

  it("fetches mentees from protected endpoint", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchMentees();
    expect(result.items).toEqual([]);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/mentees",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("creates mentee through post endpoint", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, item: { id: "1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await createMenteeRecord({
      name: "Kevin Omondi",
      email: "kevin@example.com",
      phone: "+254700000000",
      dateOfBirth: "2011-06-15",
      school: "Sunrise School",
      educationLevel: "Secondary",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/mentees",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("flags mentee through flag endpoint", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await flagMenteeRecord("abc-123");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/mentees/abc-123/flag",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
