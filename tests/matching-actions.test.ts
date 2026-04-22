import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMatchProposalRequest,
  fetchMatchCandidates,
  fetchMatchingIntake,
  fetchMatchProposals,
  respondToMatchProposalRequest,
} from "@/lib/matching-actions";

const mockFetch = vi.fn();

describe("matching actions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockFetch.mockReset();
  });

  it("fetches matching intake with search and stage", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await fetchMatchingIntake({ search: "Kevin", stage: "AWAITING_MATCHING" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/matching/intake?search=Kevin&stage=AWAITING_MATCHING",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("fetches candidates with mentee id", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ mentee: {}, items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await fetchMatchCandidates("mentee-1", 12);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/matching/candidates?menteeUserId=mentee-1&limit=12",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("creates match proposal", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, item: { mentorshipId: "m-1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await createMatchProposalRequest({
      programId: "program-1",
      mentorUserId: "mentor-1",
      menteeUserId: "mentee-1",
      checkInFrequency: "BIWEEKLY",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/matching/proposals",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("fetches proposal queue", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await fetchMatchProposals({ status: "PENDING", limit: 50 });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/matching/proposals?status=PENDING&limit=50",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("sends proposal response", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, item: { mentorshipId: "m-1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await respondToMatchProposalRequest({
      mentorshipId: "m-1",
      decision: "ACCEPT",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/matching/proposals/m-1/respond",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
