import { afterEach, describe, expect, it, vi } from "vitest";
import { updateProfileRequest } from "@/lib/profile-actions";

const mockFetch = vi.fn();

describe("profile update action", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockFetch.mockReset();
  });

  it("sends profile update to protected endpoint", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, user: { name: "Amina Otieno", email: "amina@example.com", status: "pending" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", mockFetch);

    const result = await updateProfileRequest({
      firstName: "Amina",
      lastName: "Otieno",
      phone: "+254700000000",
      email: "amina@example.com",
      dateOfBirth: "1995-04-12",
    });

    expect(result.user.email).toBe("amina@example.com");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/protected/profile",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
