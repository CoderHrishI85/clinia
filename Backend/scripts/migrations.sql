-- Clinia raw migration (no Alembic). Executed once against PostgreSQL.

-- Phase 1: multi-tenancy
ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinic_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS clinic_id INTEGER NOT NULL DEFAULT 1;

-- Phase 2: RBAC
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'admin';

-- Phase 4: soft delete
ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Soft delete releases unique phone/email so active rows stay unique (partial unique index)
DROP INDEX IF EXISTS ix_patients_phone;
DROP INDEX IF EXISTS ix_patients_email;
CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_phone_active ON patients (phone) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_email_active ON patients (email) WHERE is_deleted = FALSE;

-- Step 1: audit logging
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id INTEGER,
    clinic_id INTEGER,
    action VARCHAR(20) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    status_code INTEGER
);
CREATE INDEX IF NOT EXISTS ix_audit_logs_clinic_id ON audit_logs (clinic_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs (action);

-- Step 1: appointment conflict guard (slot duration)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 30;

-- Step 1: PHI fields (encrypted at rest)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_history TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS notes TEXT;
