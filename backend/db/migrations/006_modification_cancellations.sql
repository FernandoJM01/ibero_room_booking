-- Migration: Support cancellation requests
-- Add type column and drop NOT NULL constraint on times for cancellation support.

ALTER TABLE modification_requests ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'modification';

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'modification_requests_type_check'
  ) THEN
    ALTER TABLE modification_requests ADD CONSTRAINT modification_requests_type_check CHECK (type IN ('modification', 'cancellation'));
  END IF;
END $$;

ALTER TABLE modification_requests ALTER COLUMN new_start_time DROP NOT NULL;
ALTER TABLE modification_requests ALTER COLUMN new_end_time DROP NOT NULL;
