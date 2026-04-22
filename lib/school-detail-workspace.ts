import type { SchoolProgramRow } from "@/lib/api-types";

export const studentLevels = ["PRIMARY", "SECONDARY", "COLLEGE", "UNIVERSITY", "VOCATIONAL"] as const;
export const programEducationLevels = ["PRIMARY", "SECONDARY", "COLLEGE", "UNIVERSITY", "VOCATIONAL"] as const;

export type ModalMode = "admin" | "head" | "student" | "upload" | "program" | null;

export type ProgramActionState =
  | {
      action: "toggle";
      program: SchoolProgramRow;
      nextIsActive: boolean;
    }
  | {
      action: "delete";
      program: SchoolProgramRow;
    }
  | null;

export type SchoolAdminFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  password: string;
};

export type SchoolHeadFormState = {
  principalName: string;
  principalEmail: string;
};

export type SchoolStudentFormState = {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  educationLevel: (typeof studentLevels)[number];
};

export type SchoolProgramFormState = {
  name: string;
  description: string;
  durationMonths: string;
  minSessionsPerMonth: string;
  objectives: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  targetEducationLevels: Array<(typeof programEducationLevels)[number]>;
};

export const emptyAdminForm: SchoolAdminFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  password: "",
};

export const emptyHeadForm: SchoolHeadFormState = {
  principalName: "",
  principalEmail: "",
};

export const emptyStudentForm: SchoolStudentFormState = {
  name: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  educationLevel: "SECONDARY",
};

export const emptyProgramForm: SchoolProgramFormState = {
  name: "",
  description: "",
  durationMonths: "6",
  minSessionsPerMonth: "2",
  objectives: "",
  startDate: "",
  endDate: "",
  isActive: true,
  targetEducationLevels: ["SECONDARY"],
};

export function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
}

export function isPrincipalAssigned(principalName: string, principalEmail: string) {
  return (
    principalName.trim().toLowerCase() !== "pending assignment" &&
    principalEmail.trim().toLowerCase() !== "pending-principal@cacumator.local"
  );
}
