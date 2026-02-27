-- Add kana field to reservations table
-- Migration: 0005_add_kana_field
-- Created: 2026-02-27

ALTER TABLE reservations ADD COLUMN kana TEXT;

-- Create index for kana field for faster searches
CREATE INDEX IF NOT EXISTS idx_reservations_kana ON reservations(kana);
