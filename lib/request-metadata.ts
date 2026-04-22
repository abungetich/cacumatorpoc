export function getRequestMetadata(request: Pick<Request, "headers">) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  return {
    ipAddress,
    userAgent,
  };
}
