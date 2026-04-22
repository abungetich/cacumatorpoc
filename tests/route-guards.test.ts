import { describe, expect, it } from "vitest";
import { evaluateRouteGuard } from "@/lib/route-guards";

describe("evaluateRouteGuard", () => {
  it("redirects unauthenticated user from protected page", () => {
    const result = evaluateRouteGuard({ pathname: "/dashboard", isLoggedIn: false, isPending: false });
    expect(result).toEqual({ type: "redirect", destination: "/login" });
  });

  it("protects new workflow routes for unauthenticated users", () => {
    const result = evaluateRouteGuard({ pathname: "/work-queue", isLoggedIn: false, isPending: false });
    expect(result).toEqual({ type: "redirect", destination: "/login" });
  });

  it("protects grants route for unauthenticated users", () => {
    const result = evaluateRouteGuard({ pathname: "/grants", isLoggedIn: false, isPending: false });
    expect(result).toEqual({ type: "redirect", destination: "/login" });
  });

  it("blocks unauthenticated protected api", () => {
    const result = evaluateRouteGuard({ pathname: "/api/protected/me", isLoggedIn: false, isPending: false });
    expect(result).toEqual({ type: "json", status: 401, message: "Unauthorized" });
  });

  it("redirects pending account to pending page", () => {
    const result = evaluateRouteGuard({ pathname: "/mentees", isLoggedIn: true, isPending: true });
    expect(result).toEqual({ type: "redirect", destination: "/registration-pending" });
  });

  it("allows authenticated active user on protected page", () => {
    const result = evaluateRouteGuard({ pathname: "/profile", isLoggedIn: true, isPending: false });
    expect(result).toEqual({ type: "allow" });
  });

  it("protects configs page for unauthenticated users", () => {
    const result = evaluateRouteGuard({ pathname: "/configs", isLoggedIn: false, isPending: false });
    expect(result).toEqual({ type: "redirect", destination: "/login" });
  });

  it("protects configs nested pages for unauthenticated users", () => {
    const result = evaluateRouteGuard({ pathname: "/configs/schools", isLoggedIn: false, isPending: false });
    expect(result).toEqual({ type: "redirect", destination: "/login" });
  });

  it("redirects logged-in active users away from auth pages to work queue", () => {
    const result = evaluateRouteGuard({ pathname: "/login", isLoggedIn: true, isPending: false });
    expect(result).toEqual({ type: "redirect", destination: "/work-queue" });
  });
});
