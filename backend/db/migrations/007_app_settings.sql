-- Migration 007: small key/value settings table
-- Holds global app configuration that isn't a per-day calendar_events entry
-- (e.g. the current semester's date range, used by the recurring-reservation
-- form's "Usar fin de semestre" shortcut). One row per key, updated in place.
-- See docs/changes/2026-09-22-secretary-feedback.md #6b.

CREATE TABLE IF NOT EXISTS app_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
