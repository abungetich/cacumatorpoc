import { describe, expect, it } from "vitest";
import {
  createMatchProposalSchema,
  createGrantApplicationSchema,
  createGrantOpportunitySchema,
  createGrantTaskSchema,
  createIncidentSchema,
  createMenteeSchema,
  credentialsSchema,
  mentorTransitionSchema,
  profileUpdateSchema,
  registerSchema,
  relationshipReviewSchema,
  relationshipSessionLogSchema,
  relationshipStatusTransitionSchema,
  respondToProposalSchema,
  schoolOnboardingSchema,
  submitGrantApplicationSchema,
  upsertGrantApprovalSchema,
  updateGrantTaskSchema,
} from "@/lib/validation";

describe("validation schemas", () => {
  it("accepts valid credentials", () => {
    const parsed = credentialsSchema.safeParse({ email: "test@example.com", password: "password123" });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid registration payload", () => {
    const parsed = registerSchema.safeParse({
      firstName: "A",
      lastName: "",
      email: "invalid",
      password: "1",
      role: "MENTOR",
      phone: "12",
      dateOfBirth: "3000-01-01",
    });

    expect(parsed.success).toBe(false);
  });

  it("validates mentee creation payload", () => {
    const parsed = createMenteeSchema.safeParse({
      name: "Kevin Omondi",
      email: "kevin@example.com",
      phone: "+254700000000",
      dateOfBirth: "2011-06-15",
      school: "Sunrise School",
      educationLevel: "Secondary",
    });

    expect(parsed.success).toBe(true);
  });

  it("validates profile update payload", () => {
    const parsed = profileUpdateSchema.safeParse({
      name: "Amina Otieno",
      email: "amina@example.com",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects short incident summary", () => {
    const parsed = createIncidentSchema.safeParse({
      subject: "Concern",
      summary: "short",
      severity: "HIGH",
      immediateAction: "Escalated",
    });

    expect(parsed.success).toBe(false);
  });

  it("validates mentor transition payload", () => {
    const parsed = mentorTransitionSchema.safeParse({
      action: "APPROVE",
      reason: "All safeguarding checks complete",
    });

    expect(parsed.success).toBe(true);
  });

  it("validates match proposal payload", () => {
    const parsed = createMatchProposalSchema.safeParse({
      programId: "66666666-6666-4666-8666-666666666666",
      mentorUserId: "33333333-3333-4333-8333-333333333334",
      menteeUserId: "33333333-3333-4333-9333-333333333336",
      checkInFrequency: "BIWEEKLY",
    });

    expect(parsed.success).toBe(true);
  });

  it("validates proposal response payload", () => {
    const parsed = respondToProposalSchema.safeParse({
      decision: "ACCEPT",
    });

    expect(parsed.success).toBe(true);
  });

  it("validates school onboarding payload", () => {
    const parsed = schoolOnboardingSchema.safeParse({
      name: "Nairobi Heights Academy",
      type: "SECONDARY",
      address: "Nairobi County, CBD",
      phone: "+254700111000",
      email: "info@heights.ac.ke",
      principalName: "Alice Kimani",
      principalEmail: "principal@heights.ac.ke",
      studentPopulation: 1200,
      schoolAdmin: {
        create: true,
        firstName: "Lydia",
        lastName: "Admin",
        email: "school.admin@heights.ac.ke",
        phone: "+254700222000",
        dateOfBirth: "1987-05-20",
        password: "pass12345",
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("validates relationship session log payload", () => {
    const parsed = relationshipSessionLogSchema.safeParse({
      scheduledDate: "2026-03-03",
      actualDate: "2026-03-03",
      durationMinutes: 60,
      format: "ONLINE",
      meetingLink: "https://meet.example.com/room",
      topicsCovered: ["Goal planning", "Study support"],
      sessionNotes: "Good progress session.",
      attendanceStatus: "COMPLETED",
      nextScheduledSession: "2026-03-17",
    });

    expect(parsed.success).toBe(true);
  });

  it("validates relationship transition payload", () => {
    const parsed = relationshipStatusTransitionSchema.safeParse({
      action: "COMPLETE",
      reason: "Reached agreed milestones",
      outcome: "SUCCESSFUL",
    });

    expect(parsed.success).toBe(true);
  });

  it("validates relationship review payload", () => {
    const parsed = relationshipReviewSchema.safeParse({
      type: "MONTHLY",
      rating: 4,
      comments: "Strong engagement this month",
    });

    expect(parsed.success).toBe(true);
  });

  it("validates grant opportunity payload", () => {
    const parsed = createGrantOpportunitySchema.safeParse({
      title: "STEM Inclusion Grant 2026",
      funderName: "Future Skills Foundation",
      deadline: "2026-06-30",
      currencyCode: "USD",
      amountMinor: "2500000",
      status: "DISCOVERED",
    });

    expect(parsed.success).toBe(true);
  });

  it("validates grant application payload", () => {
    const parsed = createGrantApplicationSchema.safeParse({
      opportunityId: "66666666-6666-4666-8666-666666666666",
      title: "Cacumator STEM Cohort Application",
      currencyCode: "USD",
      amountRequestedMinor: "2250000",
    });

    expect(parsed.success).toBe(true);
  });

  it("validates grant task payload", () => {
    const parsed = createGrantTaskSchema.safeParse({
      title: "Draft outcomes section",
      section: "Outcomes",
      dueDate: "2026-04-14",
    });

    expect(parsed.success).toBe(true);
  });

  it("validates grant task update payload", () => {
    const parsed = updateGrantTaskSchema.safeParse({
      status: "DONE",
      completionNotes: "Completed and reviewed",
    });

    expect(parsed.success).toBe(true);
  });

  it("validates grant approval payload", () => {
    const parsed = upsertGrantApprovalSchema.safeParse({
      approvalType: "FINAL_SUBMISSION",
      status: "APPROVED",
      notes: "Approved by grants committee",
    });

    expect(parsed.success).toBe(true);
  });

  it("validates grant submission payload", () => {
    const parsed = submitGrantApplicationSchema.safeParse({
      confirmationReference: "GR-2026-0098",
      proofUrl: "https://portal.example.org/submissions/GR-2026-0098",
      packageVersion: "v1.3",
    });

    expect(parsed.success).toBe(true);
  });
});
