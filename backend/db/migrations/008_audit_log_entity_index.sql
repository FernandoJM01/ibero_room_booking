-- Per-reservation change history looks up audit_log by (entity, entity_id).
-- Without this index that lookup scans the whole table as it grows.
-- Idempotent: migrations re-run on every backend start.
CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON audit_log (entity, entity_id, timestamp DESC);
