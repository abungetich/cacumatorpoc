import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchRelationshipsOverview,
  logRelationshipSessionRequest,
  submitRelationshipReviewRequest,
  transitionRelationshipStatusRequest,
} from "@/lib/relationships-actions";

const mockFetch = vi.fn();

describe("relationships actions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockFetch.mockReset();
  });

  it("fetches relationships overview with filters", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await fetchRelationshipsOverview({ search: "Kevin", status: "ACTIVE", risk: "AT_RISK" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/relationships/overview?search=Kevin&status=ACTIVE&risk=AT_RISK",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("logs relationship session", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, item: { mentorshipId: "m-1", status: "ACTIVE" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await logRelationshipSessionRequest("m-1", {
      scheduledDate: "2026-03-03",
      durationMinutes: 60,
      format: "ONLINE",
      meetingLink: "https://meet.example.com/room",
      topicsCovered: ["Goal planning"],
      sessionNotes: "Session logged",
      attendanceStatus: "COMPLETED",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/relationships/m-1/session",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("transitions relationship status", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, item: { mentorshipId: "m-1", status: "PAUSED" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await transitionRelationshipStatusRequest("m-1", {
      action: "PAUSE",
      reason: "School exam season",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/relationships/m-1/status",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("submits relationship review", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, item: { mentorshipId: "m-1", status: "ACTIVE" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await submitRelationshipReviewRequest("m-1", {
      type: "MONTHLY",
      rating: 4,
      comments: "Good progress",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/relationships/m-1/review",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
