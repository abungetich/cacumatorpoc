import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createGrantApplicationRequest,
  createGrantOpportunityRequest,
  createGrantTaskRequest,
  fetchGrantWorkspace,
  submitGrantApplicationRequest,
  updateGrantTaskRequest,
  upsertGrantApprovalRequest,
} from "@/lib/grants-actions";

const mockFetch = vi.fn();

describe("grants actions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockFetch.mockReset();
  });

  it("fetches grant workspace with filters", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ opportunities: [], applications: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await fetchGrantWorkspace({ search: "STEM", stage: "WRITING" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/grants/workspace?search=STEM&stage=WRITING",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("creates grant opportunity", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, item: { id: "op-1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await createGrantOpportunityRequest({
      title: "STEM Grant",
      funderName: "Future Fund",
      deadline: "2026-06-30",
      currencyCode: "USD",
      amountMinor: "1200000",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/grants/opportunities",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("creates grant application", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, item: { id: "app-1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await createGrantApplicationRequest({
      opportunityId: "op-1",
      amountRequestedMinor: "900000",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/grants/applications",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("creates and updates grant tasks", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, item: { id: "task-1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, item: { id: "task-1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await createGrantTaskRequest("app-1", {
      title: "Draft budget",
    });

    await updateGrantTaskRequest("task-1", {
      status: "DONE",
    });

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "/api/protected/grants/applications/app-1/tasks",
      expect.objectContaining({ method: "POST" }),
    );

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "/api/protected/grants/tasks/task-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("updates approvals and submits application", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, item: { id: "app-1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, item: { id: "app-1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    await upsertGrantApprovalRequest("app-1", {
      approvalType: "FINAL_SUBMISSION",
      status: "APPROVED",
    });

    await submitGrantApplicationRequest("app-1", {
      confirmationReference: "SUB-123",
    });

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "/api/protected/grants/applications/app-1/approvals",
      expect.objectContaining({ method: "POST" }),
    );

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "/api/protected/grants/applications/app-1/submit",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
