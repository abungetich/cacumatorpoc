import { describe, expect, it } from "vitest";
import { parseStudentMasterCsv } from "@/lib/student-master-csv";

describe("parseStudentMasterCsv", () => {
  it("parses csv headers and rows", () => {
    const csv = [
      "first_name,last_name,email,school_name",
      "Jane,Doe,jane@example.org,Nairobi Sunrise Secondary School",
      "John,Kamau,john@example.org,Nairobi Sunrise Secondary School",
    ].join("\n");

    const parsed = parseStudentMasterCsv(csv);

    expect(parsed.headers).toEqual(["first_name", "last_name", "email", "school_name"]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].email).toBe("jane@example.org");
  });

  it("handles quoted values with commas", () => {
    const csv = [
      "name,email,school_name",
      "\"Doe, Jane\",jane@example.org,\"Nairobi, Sunrise Secondary School\"",
    ].join("\n");

    const parsed = parseStudentMasterCsv(csv);
    expect(parsed.rows[0].name).toBe("Doe, Jane");
    expect(parsed.rows[0].school_name).toBe("Nairobi, Sunrise Secondary School");
  });
});
