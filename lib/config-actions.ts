import type { StudentMasterUploadResponse } from "@/lib/api-types";

export async function uploadStudentMasterCsv(file: File, dryRun: boolean, schoolId?: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("dryRun", String(dryRun));
  if (schoolId) {
    formData.append("schoolId", schoolId);
  }

  const response = await fetch("/api/protected/configs/student-masters", {
    method: "POST",
    body: formData,
  });

  const body = (await response.json()) as StudentMasterUploadResponse & { message?: string };

  if (!response.ok) {
    throw new Error(body.message ?? "Upload failed");
  }

  return body;
}
