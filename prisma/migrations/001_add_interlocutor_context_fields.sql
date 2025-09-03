-- Migration: Add interlocutor context fields to Patient table
-- Date: 2025-09-01
-- Description: Adds acf_sync_status and last_context_update fields to support interlocutor logic

-- Add acf_sync_status column
ALTER TABLE Patient ADD COLUMN acf_sync_status VARCHAR(20) DEFAULT 'pending';

-- Add last_context_update column
ALTER TABLE Patient ADD COLUMN last_context_update TIMESTAMP NULL;

-- Update existing records to have proper sync status
UPDATE Patient SET acf_sync_status = CASE WHEN tipo_associacao IS NOT NULL THEN 'synced' ELSE 'pending' END;

-- Create whatsapp + association composite index
CREATE INDEX Patient_whatsapp_association_idx ON Patient(whatsapp, associationId);

-- Create index on last_context_update
CREATE INDEX Patient_context_update_idx ON Patient(last_context_update);

-- Create composite index for context lookup
CREATE INDEX Patient_context_lookup_idx ON Patient(whatsapp, associationId, tipo_associacao);