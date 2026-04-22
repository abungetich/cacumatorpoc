export type PartnerListItem = {
  id: string;
  name: string;
  type: "NGO" | "CORPORATE" | "FOUNDATION" | "GOVERNMENT";
};

export type PartnersResponse = {
  items: PartnerListItem[];
};

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  type:
    | "CORPORATE"
    | "NGO"
    | "FOUNDATION"
    | "GOVERNMENT"
    | "ALUMNI"
    | "ASSOCIATION"
    | "COMMUNITY"
    | "FAITH_BASED"
    | "OTHER";
  status: "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
  country: string;
  county: string | null;
  city: string | null;
  contactEmail: string;
  contactPhone: string | null;
  primaryContactName: string;
  adminName: string;
  adminEmail: string;
  mentorParticipation: boolean;
  financialSupport: boolean;
  inKindSupport: boolean;
  publicProfileEnabled: boolean;
  partner: {
    id: string;
    name: string;
  } | null;
  schoolsOfInterest: string[];
  counts: {
    memberships: number;
    agreements: number;
  };
  createdAt: string;
};

export type OrganizationsResponse = {
  items: OrganizationRow[];
};

export type OrganizationDetailResponse = {
  item: OrganizationRow & {
    description: string | null;
    mission: string | null;
    website: string | null;
    address: string | null;
    adminPhone: string;
    adminTitle: string | null;
    primaryContactTitle: string | null;
    agreements: Array<{
      id: string;
      code: string;
      title: string;
      version: string;
      agreedByName: string;
      agreedByEmail: string;
      agreedAt: string;
    }>;
  };
};

export type OrganizationOnboardingAgreementItem = {
  code: "PLATFORM_TERMS" | "DATA_PROCESSING" | "SAFEGUARDING" | "CONFIDENTIALITY" | "SUPPORT_TERMS";
  title: string;
  version: string;
  summary: string;
  documentBody: string;
  documentUrl: string;
  required: boolean;
  completed: boolean;
  agreedByName: string | null;
  agreedAt: string | null;
};

export type OrganizationOnboardingWorkspaceResponse = {
  item: {
    organization: {
      id: string;
      name: string;
      slug: string;
      type: OrganizationRow["type"];
      status: OrganizationRow["status"];
      logoUrl: string | null;
      website: string | null;
      registrationNumber: string | null;
      description: string | null;
      mission: string | null;
      country: string;
      county: string | null;
      city: string | null;
      address: string | null;
      contactEmail: string;
      contactPhone: string | null;
      primaryContactName: string;
      primaryContactTitle: string | null;
      adminTitle: string | null;
      mentorParticipation: boolean;
      financialSupport: boolean;
      inKindSupport: boolean;
      schoolsOfInterest: string[];
    };
    admin: {
      name: string;
      email: string;
      phone: string;
      emailVerifiedAt: string | null;
      status: "active" | "pending" | "onboarding";
    };
    requiredAgreementCount: number;
    completedAgreementCount: number;
    accountComplete: boolean;
    organizationProfileComplete: boolean;
    readyForReview: boolean;
    agreements: OrganizationOnboardingAgreementItem[];
  };
};

export type OrganizationRegistrationResponse = {
  ok: boolean;
  email: string;
  status: "verify_email";
  message?: string;
  verification?: {
    sent: boolean;
    reason: string | null;
  };
  item: {
    id: string;
    slug: string;
    status: "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
    name: string;
  };
};

export type PlatformBrandingResponse = {
  item: {
    id: string;
    platformName: string;
    logoUrl: string | null;
    ceoName: string;
    ceoTitle: string;
    ceoWelcomeMessage: string;
  };
};

export type ManagedPartnerRow = {
  id: string;
  name: string;
  type: "NGO" | "CORPORATE" | "FOUNDATION" | "GOVERNMENT";
  contactPerson: string;
  contactEmail: string;
  contactPhone: string | null;
  website: string | null;
  logoUrl: string | null;
  agreementStatus: "SIGNED" | "MISSING";
  lifecycleStatus: "ACTIVE" | "SETUP_REQUIRED";
  createdAt: string;
  counts: {
    schools: number;
    users: number;
  };
};

export type ManagedPartnersResponse = {
  items: ManagedPartnerRow[];
};

export type PartnerDetailResponse = {
  item: ManagedPartnerRow & {
    schools: Array<{
      id: string;
      name: string;
      type: "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL";
      location: string;
      students: number;
    }>;
  };
};
