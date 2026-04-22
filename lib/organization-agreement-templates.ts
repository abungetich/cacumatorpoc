export type OrganizationAgreementTemplate = {
  code: 'PLATFORM_TERMS' | 'DATA_PROCESSING' | 'SAFEGUARDING' | 'CONFIDENTIALITY' | 'SUPPORT_TERMS';
  title: string;
  version: string;
  summary: string;
  documentUrl: string;
  documentBody: string;
  required: boolean;
  requiresSupportMode?: boolean;
  sortOrder: number;
};

const ORG_AGREEMENT_VERSION = 'v1.0';

export const organizationAgreementTemplates: OrganizationAgreementTemplate[] = [
  {
    code: 'PLATFORM_TERMS',
    title: 'Platform Terms of Participation',
    version: ORG_AGREEMENT_VERSION,
    summary: 'Defines how the organization, its administrators, and its members are expected to use the platform and participate in mentorship delivery.',
    documentUrl: 'internal://organization/platform-terms',
    required: true,
    sortOrder: 10,
    documentBody: `
      <h2>Platform Terms of Participation</h2>
      <p>Dear {{admin_name}},</p>
      <p>These terms govern how <strong>{{organization_name}}</strong> participates on the {{platform_name}}.</p>
      <ol>
        <li>Your organization will provide accurate information and keep administrator and participation records current.</li>
        <li>Only authorized staff may access organization and mentorship workspaces.</li>
        <li>The organization will ensure members use the platform only for approved mentorship and support activities.</li>
        <li>The organization accepts that platform administrators may suspend access when safeguarding, compliance, or misuse concerns arise.</li>
      </ol>
      <p>Version: {{document_version}}</p>
    `,
  },
  {
    code: 'DATA_PROCESSING',
    title: 'Data Processing Agreement',
    version: ORG_AGREEMENT_VERSION,
    summary: 'Defines how learner, mentor, and organization data must be handled, protected, and retained.',
    documentUrl: 'internal://organization/data-processing',
    required: true,
    sortOrder: 20,
    documentBody: `
      <h2>Data Processing Agreement</h2>
      <p>Dear {{admin_name}},</p>
      <p>{{organization_name}} may only access and process platform data for authorized mentorship operations.</p>
      <ul>
        <li>Personal data must not be exported, shared, or repurposed without authorization.</li>
        <li>Access must be limited to approved organization administrators and members.</li>
        <li>Incidents involving data loss or unauthorized disclosure must be reported immediately.</li>
      </ul>
      <p>Version: {{document_version}}</p>
    `,
  },
  {
    code: 'SAFEGUARDING',
    title: 'Safeguarding and Child Protection Agreement',
    version: ORG_AGREEMENT_VERSION,
    summary: 'Confirms the organization understands its safeguarding obligations, escalation duties, and mentor accountability requirements.',
    documentUrl: 'internal://organization/safeguarding',
    required: true,
    sortOrder: 30,
    documentBody: `
      <h2>Safeguarding and Child Protection Agreement</h2>
      <p>Dear {{admin_name}},</p>
      <p>{{organization_name}} agrees to uphold safeguarding standards when supplying mentors or supporting mentorship activities.</p>
      <ul>
        <li>Only approved mentors may participate in youth-facing activities.</li>
        <li>Safeguarding concerns must be escalated immediately through the platform process.</li>
        <li>The organization will cooperate with platform and school investigations where required.</li>
      </ul>
      <p>Version: {{document_version}}</p>
    `,
  },
  {
    code: 'CONFIDENTIALITY',
    title: 'Confidentiality and Restricted Access Agreement',
    version: ORG_AGREEMENT_VERSION,
    summary: 'Sets the confidentiality boundary for school, learner, mentor, and operational data visible to the organization.',
    documentUrl: 'internal://organization/confidentiality',
    required: true,
    sortOrder: 40,
    documentBody: `
      <h2>Confidentiality and Restricted Access Agreement</h2>
      <p>Dear {{admin_name}},</p>
      <p>{{organization_name}} agrees that visible platform records are confidential and restricted to approved operational use.</p>
      <ul>
        <li>No sensitive child or mentor information may be shared outside approved channels.</li>
        <li>Access rights remain subject to platform review and may be withdrawn if misused.</li>
      </ul>
      <p>Version: {{document_version}}</p>
    `,
  },
  {
    code: 'SUPPORT_TERMS',
    title: 'Funding and Support Agreement',
    version: ORG_AGREEMENT_VERSION,
    summary: 'Applies when the organization provides funding, in-kind support, sponsorship, or other material support.',
    documentUrl: 'internal://organization/support-terms',
    required: false,
    requiresSupportMode: true,
    sortOrder: 50,
    documentBody: `
      <h2>Funding and Support Agreement</h2>
      <p>Dear {{admin_name}},</p>
      <p>This agreement applies because {{organization_name}} has declared a funding or support role on the platform.</p>
      <ul>
        <li>Support commitments must be recorded accurately.</li>
        <li>Restricted funds or in-kind support must be used only for their approved purpose.</li>
        <li>Reporting and evidence requirements must be met where applicable.</li>
      </ul>
      <p>Version: {{document_version}}</p>
    `,
  },
];

export function getOrganizationAgreementTemplates(input: { financialSupport: boolean; inKindSupport: boolean }) {
  const supportMode = input.financialSupport || input.inKindSupport;
  return organizationAgreementTemplates.filter((template) => !template.requiresSupportMode || supportMode);
}
