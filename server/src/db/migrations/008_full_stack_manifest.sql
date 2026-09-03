-- Migration 008: Full-Stack Project Manifest & File Ownership Classification

-- Add contract JSONB to architecture_specs
ALTER TABLE architecture_specs 
ADD COLUMN IF NOT EXISTS contract JSONB DEFAULT '{}'::jsonb;

-- Add manifest and file_inventory JSONB to implementation_revisions
ALTER TABLE implementation_revisions 
ADD COLUMN IF NOT EXISTS manifest JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS file_inventory JSONB DEFAULT '[]'::jsonb;

-- Create index on artifact_type for performance
CREATE INDEX IF NOT EXISTS idx_code_artifacts_artifact_type ON code_artifacts(artifact_type);
