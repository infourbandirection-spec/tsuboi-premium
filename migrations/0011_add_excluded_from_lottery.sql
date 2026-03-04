-- Add excluded_from_lottery flag to reservations table
-- Migration: 0011_add_excluded_from_lottery
-- Created: 2026-03-04

-- Add excluded_from_lottery flag (default false)
ALTER TABLE reservations ADD COLUMN excluded_from_lottery INTEGER DEFAULT 0;
-- 0 = 抽選対象, 1 = 抽選除外

-- Add excluded reason field
ALTER TABLE reservations ADD COLUMN excluded_reason TEXT;

-- Add excluded_at timestamp
ALTER TABLE reservations ADD COLUMN excluded_at TEXT;

-- Add excluded_by admin user
ALTER TABLE reservations ADD COLUMN excluded_by TEXT;

-- Create index for excluded_from_lottery
CREATE INDEX IF NOT EXISTS idx_reservations_excluded ON reservations(excluded_from_lottery);
