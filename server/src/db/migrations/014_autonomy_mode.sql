-- Migration 014: Dual-Mode Autonomy Support
-- Adds autonomy_mode to projects table to support 'auto_pilot' vs 'supervised' modes

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS autonomy_mode VARCHAR(32) NOT NULL DEFAULT 'auto_pilot';
