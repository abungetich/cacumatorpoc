import { type ReactNode } from 'react';
import {
  BadgeCheck,
  BookOpenCheck,
  FileSignature,
  IdCard,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import type { MentorOnboardingWorkspaceResponse } from '@/lib/api-types';

export type TrainingItem = MentorOnboardingWorkspaceResponse['item']['trainingModules'][number];
export type ConsentItem = MentorOnboardingWorkspaceResponse['item']['consentItems'][number];
export type ModalState =
  | { type: 'training'; item: TrainingItem }
  | { type: 'consent'; item: ConsentItem }
  | { type: 'background' }
  | null;

export function formatRelativeAge(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = date.getTime() - Date.now();
  const minutes = Math.round(diffMs / (1000 * 60));
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (Math.abs(minutes) < 60) {
    return rtf.format(minutes, 'minute');
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return rtf.format(hours, 'hour');
  }

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) {
    return rtf.format(days, 'day');
  }

  const weeks = Math.round(days / 7);
  if (Math.abs(weeks) < 5) {
    return rtf.format(weeks, 'week');
  }

  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) {
    return rtf.format(months, 'month');
  }

  const years = Math.round(days / 365);
  return rtf.format(years, 'year');
}

export function formatRelativeWithAbsolute(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    relative: formatRelativeAge(value),
    absolute: date.toLocaleString(),
  };
}

export function statusTone(complete: boolean) {
  return complete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
}

export function stepIcon(id: 'email' | 'profile' | 'training' | 'consents' | 'safeguarding' | 'background') {
  switch (id) {
    case 'email':
      return BadgeCheck;
    case 'profile':
      return UserRound;
    case 'training':
      return BookOpenCheck;
    case 'consents':
      return FileSignature;
    case 'safeguarding':
      return ShieldCheck;
    case 'background':
      return IdCard;
  }
}

export function getFirstName(name: string | undefined | null) {
  return name?.trim().split(/\s+/)[0] ?? 'Mentor';
}

export function formatConsentTypeLabel(value: ConsentItem['consentType']) {
  return value.replaceAll('_', ' ');
}

export function buildTrainingReaderSections(item: TrainingItem, fullName: string) {
  return [
    {
      heading: 'Addressed To',
      paragraphs: [
        `${fullName}, this training module is issued to you as part of your mentor readiness pack on the platform.`,
        'You are expected to review this module carefully and confirm that you understand the operational expectations before your account can move forward.',
      ],
    },
    {
      heading: 'Module Purpose',
      paragraphs: [
        item.description,
        `This module is recorded under version ${item.version}, contains ${item.questionCount} scored questions, and requires ${item.passingScore}% to pass.`,
        item.required ? 'This module is mandatory for review readiness.' : 'This module supports your wider mentor preparation.',
      ],
    },
    {
      heading: 'What You Are Confirming',
      paragraphs: [
        'By completing this module, you confirm that you understand the stated expectations, can apply them in mentoring practice, and will follow the platform standard described in this pack.',
        'If any part is unclear, stop here and seek clarification before recording completion.',
      ],
    },
  ];
}

export function buildConsentReaderSections(item: ConsentItem, fullName: string) {
  return [
    {
      heading: 'Addressed To',
      paragraphs: [
        `${fullName}, this document is issued to you as an active mentor applicant on the platform.`,
        `You are required to review version ${item.version} of this ${formatConsentTypeLabel(item.consentType).toLowerCase()} document before recording your assent.`,
      ],
    },
    {
      heading: 'Document Summary',
      paragraphs: [
        item.summary,
        item.required ? 'This document is required and must be completed before your account can move into review.' : 'This document supports your onboarding record.',
      ],
    },
    {
      heading: 'Assent Statement',
      paragraphs: [
        'By continuing, you confirm that you have read the document in full, understood your responsibilities, and agree to be bound by the current platform version.',
        'Your typed name, timestamp, and any signed evidence you attach will be stored as part of your onboarding record.',
      ],
    },
  ];
}

export function ReviewLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-[var(--primary)] hover:underline">
      {label}
      {icon}
    </a>
  );
}
