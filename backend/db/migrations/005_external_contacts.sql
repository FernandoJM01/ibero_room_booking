CREATE TABLE IF NOT EXISTS external_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  organization VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reservations
ALTER COLUMN responsible_id DROP NOT NULL;

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS external_responsible_id UUID REFERENCES external_contacts(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_responsible_xor'
  ) THEN
    ALTER TABLE reservations
    ADD CONSTRAINT chk_responsible_xor CHECK (
      NOT (responsible_id IS NOT NULL AND external_responsible_id IS NOT NULL)
    );
  END IF;
END $$;
