-- Migration 009: multi-room support.
-- Adds a rooms catalog and threads room_id through reservations. Every
-- existing reservation is backfilled onto one seeded room so this ships
-- without breaking production data. See
-- docs/changes/2026-09-27-multi-room-support.md.

CREATE TABLE IF NOT EXISTS rooms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  location   VARCHAR(200),
  capacity   INTEGER,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fixed id so this insert (and the backfill below) is safe to re-run: the
-- migration file re-applies on every backend start, matching every other
-- migration in this project.
INSERT INTO rooms (id, name)
VALUES ('a10e1300-0000-4000-8000-000000000001'::UUID, 'Sala Principal')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id);

UPDATE reservations
SET room_id = 'a10e1300-0000-4000-8000-000000000001'::UUID
WHERE room_id IS NULL;

ALTER TABLE reservations ALTER COLUMN room_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON reservations(room_id);
