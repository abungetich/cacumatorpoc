-- MVP demo seed data (idempotent)
-- Run after migrations: psql "$DATABASE_URL" -f prisma/seed.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- Core tenants: partner + school
-- ---------------------------------------------------------------------------
INSERT INTO partners (
  id,
  name,
  type,
  contact_person,
  contact_email,
  contact_phone,
  partnership_agreement,
  website,
  created_at,
  updated_at
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Future Leaders Foundation',
  'FOUNDATION',
  'Grace Wanjiku',
  'grace@futureleaders.org',
  '+254700111222',
  '{"agreement_number":"FLF-2026-001","start_date":"2026-01-15","end_date":"2027-01-14","status":"active"}'::jsonb,
  'https://futureleaders.example.org',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

UPDATE mentor_training_questions
SET
  question_type = CASE id
    WHEN 'f3333333-3333-4333-8333-222222222222' THEN 'MULTI_CHOICE'::"MentorTrainingQuestionType"
    ELSE 'SINGLE_CHOICE'::"MentorTrainingQuestionType"
  END,
  correct_answers = CASE id
    WHEN 'f1111111-1111-4111-8111-111111111111' THEN '["Use only approved communication channels and explain why"]'::jsonb
    WHEN 'f1111111-1111-4111-8111-222222222222' THEN '["A mentor should stay within the agreed mentoring role and escalate when issues go beyond it"]'::jsonb
    WHEN 'f2222222-2222-4222-8222-111111111111' THEN '["Follow the safeguarding escalation process immediately"]'::jsonb
    WHEN 'f2222222-2222-4222-8222-222222222222' THEN '["Document what was observed or disclosed and escalate promptly"]'::jsonb
    WHEN 'f3333333-3333-4333-8333-111111111111' THEN '["Prepare, hold the session, and record outcomes and next steps"]'::jsonb
    WHEN 'f3333333-3333-4333-8333-222222222222' THEN '["Record the missed session in the platform","Follow up through approved channels to reschedule if appropriate"]'::jsonb
    ELSE correct_answers
  END,
  options = CASE id
    WHEN 'f3333333-3333-4333-8333-222222222222' THEN '["Ignore it if the mentee seems fine","Record the missed session in the platform","Follow up through approved channels to reschedule if appropriate","Move the session to a private personal call"]'::jsonb
    ELSE options
  END,
  prompt = CASE id
    WHEN 'f3333333-3333-4333-8333-222222222222' THEN 'If a session is missed, which two actions should happen next?'
    ELSE prompt
  END,
  explanation = CASE id
    WHEN 'f3333333-3333-4333-8333-222222222222' THEN 'Missed sessions should be logged and followed up through approved channels.'
    ELSE explanation
  END
WHERE id IN (
  'f1111111-1111-4111-8111-111111111111',
  'f1111111-1111-4111-8111-222222222222',
  'f2222222-2222-4222-8222-111111111111',
  'f2222222-2222-4222-8222-222222222222',
  'f3333333-3333-4333-8333-111111111111',
  'f3333333-3333-4333-8333-222222222222'
);

INSERT INTO schools (
  id,
  partner_id,
  name,
  type,
  address,
  phone,
  email,
  principal_name,
  principal_email,
  student_population,
  socio_economic_tier,
  programs_offered,
  accreditation_status,
  created_at,
  updated_at
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Nairobi Sunrise Secondary School',
  'SECONDARY',
  'Sunrise Road, Nairobi County',
  '+254700222333',
  'admin@sunriseschool.ac.ke',
  'Peter Njoroge',
  'principal@sunriseschool.ac.ke',
  980,
  'LOWER_MIDDLE',
  '["Career Mentorship","STEM Mentorship"]'::jsonb,
  'Accredited',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

UPDATE mentor_consent_settings
SET
  document_body = CASE id
    WHEN 'e1111111-1111-4111-8111-111111111111' THEN 'You are being issued the current mentor participation terms as a condition of mentor review and approval. This document explains the baseline rules for participation, the operating boundaries of the mentoring role, the expectation to use platform-approved channels, and the obligation to document and escalate where required.\n\nBy assenting to this document, you confirm that you understand the platform standard, accept the mentor role as defined here, and will not act outside the approved mentoring scope.'
    WHEN 'e2222222-2222-4222-8222-222222222222' THEN 'You are being issued the safeguarding assent document because child protection is a non-negotiable requirement of mentoring on the platform. This document explains what counts as a safeguarding concern, how mentors must respond to disclosures or warning signs, and which actions are prohibited.\n\nBy assenting, you confirm that you understand your safeguarding duty, will not promise secrecy where harm may exist, and will follow the escalation process immediately when a concern arises.'
    WHEN 'e3333333-3333-4333-8333-333333333333' THEN 'You are being issued the data privacy and confidentiality document because mentors handle sensitive information within a controlled environment. This document explains how information should be protected, when confidentiality applies, and when disclosure is necessary for safeguarding or operational reasons.\n\nBy assenting, you confirm that you will handle personal information responsibly, use only approved systems and channels, and respect the confidentiality boundaries defined by the platform.'
    ELSE document_body
  END
WHERE id IN (
  'e1111111-1111-4111-8111-111111111111',
  'e2222222-2222-4222-8222-222222222222',
  'e3333333-3333-4333-8333-333333333333'
);

-- ---------------------------------------------------------------------------
-- Users: platform admin, partner admin, school admin, mentor, guardian, mentee
-- ---------------------------------------------------------------------------
INSERT INTO users (
  id,
  email,
  password,
  first_name,
  last_name,
  phone,
  date_of_birth,
  role,
  school_id,
  partner_id,
  email_verified_at,
  is_active,
  created_at,
  updated_at
)
VALUES
(
  '33333333-3333-3333-3333-333333333331',
  'platform.admin@mentorhub.org',
  '$2b$12$ird7/.Rr0pXoA1xhjdrVAu.8mYU8mGJs8GgR0LOC.fO3bX4JtjuoG',
  'Amina',
  'Otieno',
  '+254700333001',
  '1988-03-20',
  'PLATFORM_ADMIN',
  NULL,
  NULL,
  NOW(),
  true,
  NOW(),
  NOW()
),
(
  '33333333-3333-3333-3333-333333333332',
  'partner.admin@futureleaders.org',
  '$2b$12$ird7/.Rr0pXoA1xhjdrVAu.8mYU8mGJs8GgR0LOC.fO3bX4JtjuoG',
  'Brian',
  'Mwangi',
  '+254700333002',
  '1990-11-12',
  'PARTNER_ADMIN',
  NULL,
  '11111111-1111-1111-1111-111111111111',
  NOW(),
  true,
  NOW(),
  NOW()
),
(
  '33333333-3333-3333-3333-333333333333',
  'school.admin@sunriseschool.ac.ke',
  '$2b$12$ird7/.Rr0pXoA1xhjdrVAu.8mYU8mGJs8GgR0LOC.fO3bX4JtjuoG',
  'Lydia',
  'Kiptoo',
  '+254700333003',
  '1985-06-08',
  'SCHOOL_ADMIN',
  '22222222-2222-2222-2222-222222222222',
  NULL,
  NOW(),
  true,
  NOW(),
  NOW()
),
(
  '33333333-3333-3333-3333-333333333334',
  'mentor.john@mentorhub.org',
  '$2b$12$ird7/.Rr0pXoA1xhjdrVAu.8mYU8mGJs8GgR0LOC.fO3bX4JtjuoG',
  'John',
  'Kamau',
  '+254700333004',
  '1992-02-17',
  'MENTOR',
  '22222222-2222-2222-2222-222222222222',
  NULL,
  NOW(),
  true,
  NOW(),
  NOW()
),
(
  '33333333-3333-3333-3333-333333333335',
  'guardian.mary@example.com',
  '$2b$12$ird7/.Rr0pXoA1xhjdrVAu.8mYU8mGJs8GgR0LOC.fO3bX4JtjuoG',
  'Mary',
  'Achieng',
  '+254700333005',
  '1981-09-01',
  'GUARDIAN',
  NULL,
  NULL,
  NOW(),
  true,
  NOW(),
  NOW()
),
(
  '33333333-3333-3333-3333-333333333336',
  'mentee.kevin@sunriseschool.ac.ke',
  '$2b$12$ird7/.Rr0pXoA1xhjdrVAu.8mYU8mGJs8GgR0LOC.fO3bX4JtjuoG',
  'Kevin',
  'Omondi',
  '+254700333006',
  '2011-06-15',
  'MENTEE',
  '22222222-2222-2222-2222-222222222222',
  NULL,
  NOW(),
  true,
  NOW(),
  NOW()
),
(
  '33333333-3333-3333-3333-333333333337',
  'mentor.grace@mentorhub.org',
  '$2b$12$ird7/.Rr0pXoA1xhjdrVAu.8mYU8mGJs8GgR0LOC.fO3bX4JtjuoG',
  'Grace',
  'Wanjiku',
  '+254700333007',
  '1990-04-12',
  'MENTOR',
  '22222222-2222-2222-2222-222222222222',
  NULL,
  NOW(),
  true,
  NOW(),
  NOW()
),
(
  '33333333-3333-3333-3333-333333333338',
  'mentor.brian@mentorhub.org',
  '$2b$12$ird7/.Rr0pXoA1xhjdrVAu.8mYU8mGJs8GgR0LOC.fO3bX4JtjuoG',
  'Brian',
  'Otieno',
  '+254700333008',
  '1988-11-03',
  'MENTOR',
  '22222222-2222-2222-2222-222222222222',
  NULL,
  NOW(),
  true,
  NOW(),
  NOW()
),
(
  '33333333-3333-3333-3333-333333333339',
  'mentee.sarah@sunriseschool.ac.ke',
  '$2b$12$ird7/.Rr0pXoA1xhjdrVAu.8mYU8mGJs8GgR0LOC.fO3bX4JtjuoG',
  'Sarah',
  'Njeri',
  '+254700333009',
  '2010-09-10',
  'MENTEE',
  '22222222-2222-2222-2222-222222222222',
  NULL,
  NOW(),
  true,
  NOW(),
  NOW()
),
(
  '33333333-3333-3333-3333-333333333340',
  'mentee.liam@sunriseschool.ac.ke',
  '$2b$12$ird7/.Rr0pXoA1xhjdrVAu.8mYU8mGJs8GgR0LOC.fO3bX4JtjuoG',
  'Liam',
  'Mwangi',
  '+254700333010',
  '2011-01-14',
  'MENTEE',
  '22222222-2222-2222-2222-222222222222',
  NULL,
  NOW(),
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Mentor and mentee profiles
-- ---------------------------------------------------------------------------
INSERT INTO mentor_profiles (
  id,
  user_id,
  profession,
  employer,
  job_title,
  industry,
  years_experience,
  expertise_areas,
  mentoring_formats,
  max_mentees,
  current_mentees,
  availability,
  hours_per_month,
  motivation,
  background_check_status,
  background_check_date,
  background_check_expiry,
  background_check_document,
  training_completed,
  training_completed_date,
  safeguarding_agreed,
  safeguarding_agreed_date,
  status,
  approved_by,
  approved_at,
  created_at,
  updated_at
)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333334',
  'Software Engineer',
  'Nairobi Tech Labs',
  'Senior Backend Engineer',
  'Technology',
  8,
  '["STEM","Career Guidance","Leadership"]'::jsonb,
  '["ONLINE","HYBRID"]'::jsonb,
  3,
  0,
  '{"timezone":"Africa/Nairobi","slots":[{"day":"Tuesday","start":"16:00","end":"18:00"},{"day":"Saturday","start":"10:00","end":"12:00"}]}'::jsonb,
  12,
  'I want to support students from underserved communities to build confidence and career clarity.',
  'CLEARED',
  '2026-01-10',
  '2027-01-10',
  'https://docs.example.org/background-checks/john-kamau.pdf',
  true,
  '2026-01-20',
  true,
  '2026-01-20',
  'APPROVED',
  '33333333-3333-3333-3333-333333333331',
  NOW(),
  NOW(),
  NOW()
),
(
  '44444444-4444-4444-4444-444444444445',
  '33333333-3333-3333-3333-333333333337',
  'Program Manager',
  'Future Leaders Foundation',
  'STEM Program Lead',
  'Education',
  7,
  '["STEM","Robotics","Leadership","Career Guidance"]'::jsonb,
  '["ONLINE","HYBRID","IN_PERSON"]'::jsonb,
  4,
  0,
  '{"timezone":"Africa/Nairobi","slots":[{"day":"Wednesday","start":"16:00","end":"18:00"},{"day":"Saturday","start":"09:00","end":"12:00"}]}'::jsonb,
  16,
  'Support girls and boys in STEM pathways with practical exposure.',
  'CLEARED',
  '2026-01-15',
  '2027-01-15',
  'https://docs.example.org/background-checks/grace-wanjiku.pdf',
  true,
  '2026-01-20',
  true,
  '2026-01-20',
  'APPROVED',
  '33333333-3333-3333-3333-333333333331',
  NOW(),
  NOW(),
  NOW()
),
(
  '44444444-4444-4444-4444-444444444446',
  '33333333-3333-3333-3333-333333333338',
  'Data Analyst',
  'Nairobi Analytics Lab',
  'Senior Analyst',
  'Technology',
  6,
  '["Math","Data","STEM","Problem Solving"]'::jsonb,
  '["ONLINE","HYBRID"]'::jsonb,
  4,
  0,
  '{"timezone":"Africa/Nairobi","slots":[{"day":"Tuesday","start":"17:00","end":"19:00"},{"day":"Thursday","start":"17:00","end":"19:00"}]}'::jsonb,
  12,
  'Help secondary-school learners build confidence in analytics and STEM.',
  'CLEARED',
  '2026-01-18',
  '2027-01-18',
  'https://docs.example.org/background-checks/brian-otieno.pdf',
  true,
  '2026-01-22',
  true,
  '2026-01-22',
  'APPROVED',
  '33333333-3333-3333-3333-333333333331',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mentee_profiles (
  id,
  user_id,
  school_id,
  education_level,
  grade,
  course,
  enrollment_status,
  interests,
  goals,
  specific_challenges,
  preferred_format,
  parent_guardian_name,
  parent_guardian_contact,
  parent_guardian_email,
  parent_guardian_consent,
  parent_guardian_consent_date,
  guardian_user_id,
  emergency_contact_name,
  emergency_contact_phone,
  special_requirements,
  status,
  previous_mentors,
  created_at,
  updated_at
)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333336',
  '22222222-2222-2222-2222-222222222222',
  'SECONDARY',
  'Form 2',
  NULL,
  'FULL_TIME',
  '["Robotics","Computer Science","Math"]'::jsonb,
  '["Improve STEM grades","Learn programming fundamentals"]'::jsonb,
  'Limited access to computers after school.',
  'HYBRID',
  'Mary Achieng',
  '+254700333005',
  'guardian.mary@example.com',
  true,
  '2026-02-01',
  '33333333-3333-3333-3333-333333333335',
  'James Ochieng',
  '+254700444999',
  'Needs occasional weekend scheduling flexibility.',
  'MATCHED',
  '[]'::jsonb,
  NOW(),
  NOW()
),
(
  '55555555-5555-5555-5555-555555555556',
  '33333333-3333-3333-3333-333333333339',
  '22222222-2222-2222-2222-222222222222',
  'SECONDARY',
  'Form 3',
  NULL,
  'FULL_TIME',
  '["Robotics","Computer Science","Math"]'::jsonb,
  '["Build a robotics prototype","Improve coding confidence"]'::jsonb,
  'Needs confidence support when presenting technical work.',
  'HYBRID',
  'Mary Njeri',
  '+254700333011',
  'guardian.sarah@example.com',
  true,
  '2026-03-01',
  NULL,
  'Peter Njeri',
  '+254700333012',
  NULL,
  'WAITING',
  '[]'::jsonb,
  NOW(),
  NOW()
),
(
  '55555555-5555-5555-5555-555555555557',
  '33333333-3333-3333-3333-333333333340',
  '22222222-2222-2222-2222-222222222222',
  'SECONDARY',
  'Form 2',
  NULL,
  'FULL_TIME',
  '["Leadership","Debate","Entrepreneurship"]'::jsonb,
  '["Improve public speaking","Explore leadership opportunities"]'::jsonb,
  'Would benefit from a mentor comfortable with public speaking and confidence coaching.',
  'ONLINE',
  'Ann Mwangi',
  '+254700333013',
  'guardian.liam@example.com',
  true,
  '2026-03-01',
  NULL,
  'James Mwangi',
  '+254700333014',
  NULL,
  'WAITING',
  '[]'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mentor_onboarding (
  id,
  user_id,
  current_stage,
  readiness_state,
  can_be_approved,
  can_be_matched,
  readiness_blockers,
  pending_mentorship_count,
  active_mentorship_count,
  paused_mentorship_count,
  unresolved_declined_consent_count,
  profile_completion_percentage,
  email_verified_at,
  profile_completed_at,
  training_completed_at,
  consent_signed_at,
  background_screening_status,
  approved_at,
  created_at,
  updated_at
)
VALUES
(
  '99999999-9999-9999-9999-999999999001',
  '33333333-3333-3333-3333-333333333337',
  'ACTIVE',
  'MATCHABLE',
  true,
  true,
  ARRAY[]::text[],
  0,
  0,
  0,
  0,
  100,
  NOW(),
  NOW(),
  NOW(),
  NOW(),
  'CLEARED',
  NOW(),
  NOW(),
  NOW()
),
(
  '99999999-9999-9999-9999-999999999002',
  '33333333-3333-3333-3333-333333333338',
  'ACTIVE',
  'MATCHABLE',
  true,
  true,
  ARRAY[]::text[],
  0,
  0,
  0,
  0,
  100,
  NOW(),
  NOW(),
  NOW(),
  NOW(),
  'CLEARED',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;

UPDATE mentee_profiles
SET
  intake_stage_cached = CASE id
    WHEN '55555555-5555-5555-5555-555555555556' THEN 'AWAITING_MATCHING'::"MenteeIntakeStage"
    WHEN '55555555-5555-5555-5555-555555555557' THEN 'AWAITING_MATCHING'::"MenteeIntakeStage"
    ELSE intake_stage_cached
  END,
  requires_consent_cached = CASE id
    WHEN '55555555-5555-5555-5555-555555555556' THEN true
    WHEN '55555555-5555-5555-5555-555555555557' THEN true
    ELSE requires_consent_cached
  END,
  has_consent_cached = CASE id
    WHEN '55555555-5555-5555-5555-555555555556' THEN true
    WHEN '55555555-5555-5555-5555-555555555557' THEN true
    ELSE has_consent_cached
  END
WHERE id IN (
  '55555555-5555-5555-5555-555555555556',
  '55555555-5555-5555-5555-555555555557'
);

-- ---------------------------------------------------------------------------
-- Program + active mentorship
-- ---------------------------------------------------------------------------
INSERT INTO programs (
  id,
  school_id,
  name,
  description,
  duration_months,
  min_sessions_per_month,
  objectives,
  target_education_levels,
  start_date,
  end_date,
  is_active,
  created_at,
  updated_at
)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '22222222-2222-2222-2222-222222222222',
  'STEM Mentorship 2026 Cohort A',
  'Mentorship program for secondary students pursuing STEM pathways.',
  6,
  2,
  '["Career exposure","Confidence building","Academic support"]'::jsonb,
  '["SECONDARY"]'::jsonb,
  '2026-02-01',
  '2026-07-31',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mentorships (
  id,
  program_id,
  mentor_id,
  mentee_id,
  status,
  started_at,
  scheduled_end_date,
  actual_end_date,
  pause_reason,
  termination_reason,
  termination_notes,
  outcome,
  outcome_notes,
  last_session_date,
  next_scheduled_session,
  check_in_frequency,
  created_at,
  updated_at
)
VALUES (
  '77777777-7777-7777-7777-777777777777',
  '66666666-6666-6666-6666-666666666666',
  '33333333-3333-3333-3333-333333333334',
  '33333333-3333-3333-3333-333333333336',
  'ACTIVE',
  '2026-02-05',
  '2026-07-31',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  '2026-02-20',
  '2026-03-05',
  'BIWEEKLY',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mentor_program_applications (
  id,
  mentor_user_id,
  program_id,
  status,
  availability_notes,
  interest_areas,
  commitment_hours_per_month,
  application_note,
  applied_at,
  reviewed_at,
  reviewed_by_id,
  review_notes,
  created_at,
  updated_at
)
VALUES
(
  '80000000-0000-0000-0000-000000000001',
  '33333333-3333-3333-3333-333333333337',
  '66666666-6666-6666-6666-666666666666',
  'APPROVED',
  'Available Wednesdays and Saturdays for hybrid support.',
  '["STEM","Robotics","Leadership"]'::jsonb,
  16,
  'Approved seed mentor for STEM matching tests.',
  NOW(),
  NOW(),
  '33333333-3333-3333-3333-333333333331',
  'Eligible for cohort A.',
  NOW(),
  NOW()
),
(
  '80000000-0000-0000-0000-000000000002',
  '33333333-3333-3333-3333-333333333338',
  '66666666-6666-6666-6666-666666666666',
  'APPROVED',
  'Available Tuesday and Thursday evenings online.',
  '["Math","STEM","Problem Solving"]'::jsonb,
  12,
  'Approved seed mentor for STEM matching tests.',
  NOW(),
  NOW(),
  '33333333-3333-3333-3333-333333333331',
  'Eligible for cohort A.',
  NOW(),
  NOW()
),
(
  '80000000-0000-0000-0000-000000000003',
  '33333333-3333-3333-3333-333333333334',
  '66666666-6666-6666-6666-666666666666',
  'APPROVED',
  'Existing seed mentor approved for testing.',
  '["STEM","Career Guidance","Leadership"]'::jsonb,
  12,
  'Backfilled approval for existing seed mentor.',
  NOW(),
  NOW(),
  '33333333-3333-3333-3333-333333333331',
  'Eligible for cohort A.',
  NOW(),
  NOW()
)
ON CONFLICT (mentor_user_id, program_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Sessions, goals, feedback
-- ---------------------------------------------------------------------------
INSERT INTO sessions (
  id,
  mentorship_id,
  scheduled_date,
  actual_date,
  duration_minutes,
  format,
  location,
  meeting_link,
  topics_covered,
  session_notes,
  progress_indicators,
  next_steps,
  attendance_status,
  cancellation_reason,
  created_by,
  created_at,
  updated_at
)
VALUES
(
  '88888888-8888-8888-8888-888888888881',
  '77777777-7777-7777-7777-777777777777',
  '2026-02-20',
  '2026-02-20',
  60,
  'ONLINE',
  NULL,
  'https://meet.example.org/mentorship/session-1',
  '["Program orientation","Goal setting","Study planning"]'::jsonb,
  'Kevin identified strong interest in robotics and requested a weekly practice plan.',
  '{"engagement":"high","confidence_delta":15}'::jsonb,
  'Mentor to share beginner Python resources before next session.',
  'COMPLETED',
  NULL,
  '33333333-3333-3333-3333-333333333334',
  NOW(),
  NOW()
),
(
  '88888888-8888-8888-8888-888888888882',
  '77777777-7777-7777-7777-777777777777',
  '2026-03-05',
  NULL,
  60,
  'IN_PERSON',
  'Nairobi Sunrise Secondary School - Library',
  NULL,
  '["Python basics","Academic check-in"]'::jsonb,
  'Upcoming in-person practical session.',
  NULL,
  'Prepare laptop and install Python runtime.',
  'SCHEDULED',
  NULL,
  '33333333-3333-3333-3333-333333333334',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO goals (
  id,
  mentorship_id,
  title,
  description,
  target_date,
  status,
  progress_percentage,
  notes,
  created_at,
  updated_at
)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  '77777777-7777-7777-7777-777777777777',
  'Build first robotics mini-project',
  'Design and demo a line-following robot prototype with mentor guidance.',
  '2026-05-30',
  'IN_PROGRESS',
  35,
  'Student completed first Arduino tutorial and basic sensor wiring.',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO feedback (
  id,
  mentorship_id,
  from_user_id,
  to_user_id,
  type,
  rating,
  strengths,
  areas_for_improvement,
  comments,
  submitted_at,
  is_anonymous
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '77777777-7777-7777-7777-777777777777',
  '33333333-3333-3333-3333-333333333336',
  '33333333-3333-3333-3333-333333333334',
  'MONTHLY',
  5,
  'Patient explanations and practical examples.',
  'Would like one extra revision session before exams.',
  'I now feel more confident in coding and asking questions.',
  NOW(),
  false
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Mentor starter packs
-- ---------------------------------------------------------------------------
INSERT INTO mentor_training_module_settings (
  id,
  title,
  description,
  module_body,
  version,
  required,
  passing_score,
  max_attempts,
  estimated_minutes,
  sort_order,
  is_active,
  created_at,
  updated_at
)
VALUES
(
  'd1111111-1111-4111-8111-111111111111',
  'Code of Conduct and Mentor Boundaries',
  'Understand the expected professional conduct, appropriate boundaries, and how mentors are expected to show up on the platform.',
  'Mentors are expected to maintain professional boundaries at all times. This includes avoiding dual relationships, protecting the dignity of mentees, and staying within the communication rules approved by the platform and school. When in doubt, choose the safer, documented, and supervised path.\n\nYou must avoid promises you cannot keep, avoid private side arrangements with mentees, and escalate anything that could create a safeguarding, conflict-of-interest, or dependency risk. Your role is supportive and developmental, not parental, therapeutic, or disciplinary.\n\nBefore proceeding, review the boundaries expected in communication, session conduct, confidentiality, and escalation. You will be assessed on whether you can identify the safer mentoring response in realistic scenarios.',
  'v1.0',
  true,
  100,
  3,
  20,
  1,
  true,
  NOW(),
  NOW()
),
(
  'd2222222-2222-4222-8222-222222222222',
  'Child Protection and Safeguarding Basics',
  'Review how safeguarding works on the platform, what warning signs to escalate, and how child protection concerns must be handled.',
  'Safeguarding is a non-negotiable requirement. Mentors must recognize warning signs, maintain appropriate boundaries, and escalate concerns through approved channels without delay. The platform expects mentors to act early, document clearly, and never attempt to manage serious child protection issues alone.\n\nIf a disclosure or warning sign suggests that a child may be at risk, your duty is to follow the platform safeguarding process immediately. Do not promise secrecy. Do not investigate independently. Do not move the conversation into unsupervised channels.\n\nThis module checks whether you understand what to escalate, how to respond to disclosures, and which actions are prohibited during safeguarding events.',
  'v1.0',
  true,
  100,
  3,
  25,
  2,
  true,
  NOW(),
  NOW()
),
(
  'd3333333-3333-4333-8333-333333333333',
  'Communication and Session Practice',
  'Learn the standard expectations for communication, session preparation, session logging, and follow-through with mentees.',
  'Mentoring sessions must be purposeful, documented, and consistent. Mentors are expected to prepare for sessions, agree on goals, keep communication respectful and structured, and log outcomes in the platform. Good intent is not enough; reliable follow-through is part of the mentor standard.\n\nCommunication should remain within approved channels and should be appropriate to the mentee''s age and context. Sessions should end with clear next steps, and any missed or cancelled session should be handled transparently.\n\nThis module checks that you understand the operational standard for session preparation, communication, and follow-through.',
  'v1.0',
  true,
  80,
  5,
  15,
  3,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

UPDATE mentor_training_module_settings
SET
  module_body = CASE id
    WHEN 'd1111111-1111-4111-8111-111111111111' THEN 'Mentors are expected to maintain professional boundaries at all times. This includes avoiding dual relationships, protecting the dignity of mentees, and staying within the communication rules approved by the platform and school. When in doubt, choose the safer, documented, and supervised path.\n\nYou must avoid promises you cannot keep, avoid private side arrangements with mentees, and escalate anything that could create a safeguarding, conflict-of-interest, or dependency risk. Your role is supportive and developmental, not parental, therapeutic, or disciplinary.\n\nBefore proceeding, review the boundaries expected in communication, session conduct, confidentiality, and escalation. You will be assessed on whether you can identify the safer mentoring response in realistic scenarios.'
    WHEN 'd2222222-2222-4222-8222-222222222222' THEN 'Safeguarding is a non-negotiable requirement. Mentors must recognize warning signs, maintain appropriate boundaries, and escalate concerns through approved channels without delay. The platform expects mentors to act early, document clearly, and never attempt to manage serious child protection issues alone.\n\nIf a disclosure or warning sign suggests that a child may be at risk, your duty is to follow the platform safeguarding process immediately. Do not promise secrecy. Do not investigate independently. Do not move the conversation into unsupervised channels.\n\nThis module checks whether you understand what to escalate, how to respond to disclosures, and which actions are prohibited during safeguarding events.'
    WHEN 'd3333333-3333-4333-8333-333333333333' THEN 'Mentoring sessions must be purposeful, documented, and consistent. Mentors are expected to prepare for sessions, agree on goals, keep communication respectful and structured, and log outcomes in the platform. Good intent is not enough; reliable follow-through is part of the mentor standard.\n\nCommunication should remain within approved channels and should be appropriate to the mentee''s age and context. Sessions should end with clear next steps, and any missed or cancelled session should be handled transparently.\n\nThis module checks that you understand the operational standard for session preparation, communication, and follow-through.'
    ELSE module_body
  END,
  passing_score = CASE id
    WHEN 'd3333333-3333-4333-8333-333333333333' THEN 80
    ELSE 100
  END,
  max_attempts = CASE id
    WHEN 'd3333333-3333-4333-8333-333333333333' THEN 5
    ELSE 3
  END
WHERE id IN (
  'd1111111-1111-4111-8111-111111111111',
  'd2222222-2222-4222-8222-222222222222',
  'd3333333-3333-4333-8333-333333333333'
);

INSERT INTO mentor_training_questions (
  id,
  module_id,
  prompt,
  explanation,
  question_type,
  options,
  correct_answer,
  correct_answers,
  image_url,
  sort_order,
  is_active,
  created_at,
  updated_at
)
VALUES
(
  'f1111111-1111-4111-8111-111111111111',
  'd1111111-1111-4111-8111-111111111111',
  'A mentee asks you to continue a sensitive conversation using your personal messaging account because it feels more private. What is the correct response?',
  'Platform-approved and supervised communication channels must be used for mentoring contact.',
  'SINGLE_CHOICE',
  '["Move to personal messaging because the mentee asked for privacy","Use only approved communication channels and explain why","Continue on a personal account but tell the school later","Ask the mentee to delete the previous messages"]'::jsonb,
  'Use only approved communication channels and explain why',
  '["Use only approved communication channels and explain why"]'::jsonb,
  NULL,
  1,
  true,
  NOW(),
  NOW()
),
(
  'f1111111-1111-4111-8111-222222222222',
  'd1111111-1111-4111-8111-111111111111',
  'Which statement best reflects the mentor boundary standard?',
  'Mentors should stay within a developmental support role and avoid taking on prohibited roles.',
  'SINGLE_CHOICE',
  '["A mentor may become a mentee''s main emotional support outside the platform","A mentor should stay within the agreed mentoring role and escalate when issues go beyond it","A mentor should keep difficult situations private to protect trust","A mentor can make exceptions to the code of conduct when intentions are good"]'::jsonb,
  'A mentor should stay within the agreed mentoring role and escalate when issues go beyond it',
  '["A mentor should stay within the agreed mentoring role and escalate when issues go beyond it"]'::jsonb,
  NULL,
  2,
  true,
  NOW(),
  NOW()
),
(
  'f2222222-2222-4222-8222-111111111111',
  'd2222222-2222-4222-8222-222222222222',
  'A mentee discloses a situation that may indicate harm at home and asks you not to tell anyone. What should you do?',
  'Never promise secrecy where a safety concern may exist. Follow the safeguarding process immediately.',
  'SINGLE_CHOICE',
  '["Promise confidentiality and wait to see if it gets worse","Tell only another mentor and keep it informal","Follow the safeguarding escalation process immediately","Handle it privately to avoid alarming the mentee"]'::jsonb,
  'Follow the safeguarding escalation process immediately',
  '["Follow the safeguarding escalation process immediately"]'::jsonb,
  NULL,
  1,
  true,
  NOW(),
  NOW()
),
(
  'f2222222-2222-4222-8222-222222222222',
  'd2222222-2222-4222-8222-222222222222',
  'What is the safest response when a child protection concern arises?',
  'Do not investigate independently; document and escalate through the approved route.',
  'SINGLE_CHOICE',
  '["Investigate first so you can present a complete case","Wait for the next scheduled review meeting","Document what was observed or disclosed and escalate promptly","Ask the mentee to keep the issue between the two of you"]'::jsonb,
  'Document what was observed or disclosed and escalate promptly',
  '["Document what was observed or disclosed and escalate promptly"]'::jsonb,
  NULL,
  2,
  true,
  NOW(),
  NOW()
),
(
  'f3333333-3333-4333-8333-111111111111',
  'd3333333-3333-4333-8333-333333333333',
  'Which practice best reflects the expected session standard?',
  'Sessions should be prepared, purposeful, and followed by documented next steps.',
  'SINGLE_CHOICE',
  '["Run sessions informally and rely on memory afterward","Prepare, hold the session, and record outcomes and next steps","Skip logging unless something went wrong","Only document sessions when a school asks for it"]'::jsonb,
  'Prepare, hold the session, and record outcomes and next steps',
  '["Prepare, hold the session, and record outcomes and next steps"]'::jsonb,
  NULL,
  1,
  true,
  NOW(),
  NOW()
),
(
  'f3333333-3333-4333-8333-222222222222',
  'd3333333-3333-4333-8333-333333333333',
  'If a session is missed, which two actions should happen next?',
  'Missed sessions should be logged and followed up through approved channels.',
  'MULTI_CHOICE',
  '["Ignore it if the mentee seems fine","Record the missed session in the platform","Follow up through approved channels to reschedule if appropriate","Move the session to a private personal call"]'::jsonb,
  'Record the missed session in the platform',
  '["Record the missed session in the platform","Follow up through approved channels to reschedule if appropriate"]'::jsonb,
  NULL,
  2,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mentor_consent_settings (
  id,
  title,
  consent_type,
  version,
  summary,
  document_body,
  document_url,
  required,
  sort_order,
  is_active,
  created_at,
  updated_at
)
VALUES
(
  'e1111111-1111-4111-8111-111111111111',
  'Mentor Participation Terms',
  'MENTORSHIP_AGREEMENT',
  'v1.0',
  'Defines the operating expectations for mentors, participation rules, reporting obligations, and the overall mentor commitment on the platform.',
  'You are being issued the current mentor participation terms as a condition of mentor review and approval. This document explains the baseline rules for participation, the operating boundaries of the mentoring role, the expectation to use platform-approved channels, and the obligation to document and escalate where required.\n\nBy assenting to this document, you confirm that you understand the platform standard, accept the mentor role as defined here, and will not act outside the approved mentoring scope.',
  'https://docs.example.org/consents/mentor-participation-terms-v1.pdf',
  true,
  1,
  true,
  NOW(),
  NOW()
),
(
  'e2222222-2222-4222-8222-222222222222',
  'Safeguarding Assent',
  'SAFEGUARDING',
  'v1.0',
  'Confirms that the mentor has read the safeguarding terms, understands child protection expectations, and agrees to follow the platform safeguarding process.',
  'You are being issued the safeguarding assent document because child protection is a non-negotiable requirement of mentoring on the platform. This document explains what counts as a safeguarding concern, how mentors must respond to disclosures or warning signs, and which actions are prohibited.\n\nBy assenting, you confirm that you understand your safeguarding duty, will not promise secrecy where harm may exist, and will follow the escalation process immediately when a concern arises.',
  'https://docs.example.org/consents/safeguarding-assent-v1.pdf',
  true,
  2,
  true,
  NOW(),
  NOW()
),
(
  'e3333333-3333-4333-8333-333333333333',
  'Data Privacy and Confidentiality',
  'DATA_PROCESSING',
  'v1.0',
  'Explains how mentor and mentee information must be handled, what confidentiality means in practice, and how data should be protected.',
  'You are being issued the data privacy and confidentiality document because mentors handle sensitive information within a controlled environment. This document explains how information should be protected, when confidentiality applies, and when disclosure is necessary for safeguarding or operational reasons.\n\nBy assenting, you confirm that you will handle personal information responsibly, use only approved systems and channels, and respect the confidentiality boundaries defined by the platform.',
  'https://docs.example.org/consents/data-privacy-confidentiality-v1.pdf',
  true,
  3,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Consents + audit log
-- ---------------------------------------------------------------------------
INSERT INTO consents (
  id,
  user_id,
  consent_type,
  version,
  agreed_at,
  agreed_by_ip,
  document_url,
  expires_at,
  revoked_at
)
VALUES
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  '33333333-3333-3333-3333-333333333336',
  'DATA_PROCESSING',
  'v1.0',
  NOW(),
  '102.89.10.44',
  'https://docs.example.org/consents/data-processing-v1.pdf',
  '2027-02-01',
  NULL
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  '33333333-3333-3333-3333-333333333336',
  'MENTORSHIP_AGREEMENT',
  'v1.0',
  NOW(),
  '102.89.10.44',
  'https://docs.example.org/consents/mentorship-agreement-v1.pdf',
  '2027-02-01',
  NULL
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
  '33333333-3333-3333-3333-333333333336',
  'SAFEGUARDING',
  'v1.0',
  NOW(),
  '102.89.10.44',
  'https://docs.example.org/consents/safeguarding-v1.pdf',
  '2027-02-01',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (
  id,
  user_id,
  action,
  entity_type,
  entity_id,
  old_values,
  new_values,
  ip_address,
  user_agent,
  created_at
)
VALUES
(
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  '33333333-3333-3333-3333-333333333331',
  'MENTOR_APPROVED',
  'mentor_profiles',
  '44444444-4444-4444-4444-444444444444',
  '{"status":"PENDING","background_check_status":"PENDING"}'::jsonb,
  '{"status":"APPROVED","background_check_status":"CLEARED"}'::jsonb,
  '41.89.12.10',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)',
  NOW()
),
(
  'cccccccc-cccc-cccc-cccc-ccccccccccc2',
  '33333333-3333-3333-3333-333333333333',
  'MENTORSHIP_ACTIVATED',
  'mentorships',
  '77777777-7777-7777-7777-777777777777',
  '{"status":"PENDING"}'::jsonb,
  '{"status":"ACTIVE","started_at":"2026-02-05"}'::jsonb,
  '41.89.12.11',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
