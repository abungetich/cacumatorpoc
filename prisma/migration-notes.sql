-- Migration notes for constraints that Prisma schema cannot fully express.
-- Apply these in a SQL migration after `prisma migrate` creates base tables.

-- 1) One active mentorship per mentee at a time (configurable default = ON)
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_mentorship_per_mentee
ON mentorships (mentee_id)
WHERE status = 'ACTIVE';

-- Optional: prevent duplicate concurrent active mentor-mentee pair.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_mentor_mentee_pair
ON mentorships (mentor_id, mentee_id)
WHERE status = 'ACTIVE';

-- 2) Numeric range checks
ALTER TABLE goals
  ADD CONSTRAINT goals_progress_percentage_range_chk
  CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

ALTER TABLE feedback
  ADD CONSTRAINT feedback_rating_range_chk
  CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE sessions
  ADD CONSTRAINT sessions_duration_minutes_positive_chk
  CHECK (duration_minutes > 0);

-- 3) Conditional field checks
ALTER TABLE mentorships
  ADD CONSTRAINT mentorship_started_at_required_when_active_chk
  CHECK (status <> 'ACTIVE' OR started_at IS NOT NULL);

ALTER TABLE sessions
  ADD CONSTRAINT sessions_location_required_if_in_person_chk
  CHECK (format <> 'IN_PERSON' OR location IS NOT NULL);

ALTER TABLE sessions
  ADD CONSTRAINT sessions_meeting_link_required_if_online_chk
  CHECK (format <> 'ONLINE' OR meeting_link IS NOT NULL);

-- 4) Mentor gating + capacity enforcement at write time
CREATE OR REPLACE FUNCTION enforce_mentorship_gates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  mentor_profile mentor_profiles%ROWTYPE;
  mentor_user users%ROWTYPE;
  mentee_user users%ROWTYPE;
  active_count integer;
BEGIN
  IF NEW.status = 'ACTIVE' THEN
    SELECT * INTO mentor_profile FROM mentor_profiles WHERE user_id = NEW.mentor_id;
    IF mentor_profile.id IS NULL THEN
      RAISE EXCEPTION 'Mentor profile missing for mentor_id=%', NEW.mentor_id;
    END IF;

    IF mentor_profile.status <> 'APPROVED' OR mentor_profile.background_check_status <> 'CLEARED' THEN
      RAISE EXCEPTION 'Mentor is not approved/cleared for activation';
    END IF;

    SELECT * INTO mentor_user FROM users WHERE id = NEW.mentor_id;
    SELECT * INTO mentee_user FROM users WHERE id = NEW.mentee_id;

    IF mentor_user.role <> 'MENTOR' OR mentor_user.is_active = false THEN
      RAISE EXCEPTION 'Mentor user role or active status invalid';
    END IF;

    IF mentee_user.role <> 'MENTEE' OR mentee_user.is_active = false THEN
      RAISE EXCEPTION 'Mentee user role or active status invalid';
    END IF;

    SELECT count(*) INTO active_count
    FROM mentorships m
    WHERE m.mentor_id = NEW.mentor_id
      AND m.status = 'ACTIVE'
      AND m.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');

    IF active_count >= mentor_profile.max_mentees THEN
      RAISE EXCEPTION 'Mentor capacity exceeded (max_mentees=%)', mentor_profile.max_mentees;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_mentorship_gates ON mentorships;
CREATE TRIGGER trg_enforce_mentorship_gates
BEFORE INSERT OR UPDATE OF status, mentor_id, mentee_id
ON mentorships
FOR EACH ROW
EXECUTE FUNCTION enforce_mentorship_gates();

-- 5) Keep mentor_profiles.current_mentees in sync
CREATE OR REPLACE FUNCTION refresh_current_mentees_for_mentor(p_mentor_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE mentor_profiles mp
  SET current_mentees = (
    SELECT count(*)
    FROM mentorships m
    WHERE m.mentor_id = p_mentor_id
      AND m.status = 'ACTIVE'
  )
  WHERE mp.user_id = p_mentor_id;
END;
$$;

CREATE OR REPLACE FUNCTION sync_current_mentees_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_current_mentees_for_mentor(OLD.mentor_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    PERFORM refresh_current_mentees_for_mentor(OLD.mentor_id);
    PERFORM refresh_current_mentees_for_mentor(NEW.mentor_id);
    RETURN NEW;
  END IF;

  PERFORM refresh_current_mentees_for_mentor(NEW.mentor_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_current_mentees ON mentorships;
CREATE TRIGGER trg_sync_current_mentees
AFTER INSERT OR UPDATE OR DELETE
ON mentorships
FOR EACH ROW
EXECUTE FUNCTION sync_current_mentees_trigger();

-- 6) Consent gate reminder
-- Enforce consent validity in service layer for flexibility across jurisdictions,
-- or add a trigger that checks non-revoked, non-expired consent records before
-- allowing ACTIVE mentorship status.
