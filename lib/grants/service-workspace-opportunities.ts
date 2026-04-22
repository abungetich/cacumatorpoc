import { mapGrantOpportunity } from "@/lib/grants/service-support";

export function mapWorkspaceOpportunities(
  opportunities: Parameters<typeof mapGrantOpportunity>[0][],
  search: string,
) {
  return opportunities
    .map((item) => mapGrantOpportunity(item))
    .filter((item) => {
      if (!search) {
        return true;
      }

      const haystack = `${item.title} ${item.funderName} ${item.description ?? ""} ${item.status} ${item.schoolName} ${
        item.partnerName
      } ${item.sourceType ?? ""} ${item.sourceReference ?? ""}`.toLowerCase();
      return haystack.includes(search);
    });
}
