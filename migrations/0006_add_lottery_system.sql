-- Add lottery system tables and fields
-- Migration: 0006_add_lottery_system
-- Created: 2026-02-27

-- Add lottery status to reservations
ALTER TABLE reservations ADD COLUMN lottery_status TEXT DEFAULT 'pending';
-- Values: 'pending' (抽選待ち), 'won' (当選), 'lost' (落選), 'n/a' (抽選対象外)

-- Add reservation phase tracking
ALTER TABLE reservations ADD COLUMN reservation_phase INTEGER DEFAULT 1;
-- Phase 1: Initial fixed dates (Mar 16-18)
-- Phase 2: Post-lottery flexible dates (Mar 17+)

-- Add lottery_executed timestamp
ALTER TABLE reservations ADD COLUMN lottery_executed_at TEXT;

-- Create system settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial system settings
INSERT OR IGNORE INTO system_settings (setting_key, setting_value) VALUES
  ('reservation_enabled', 'true'),
  ('lottery_executed', 'false'),
  ('lottery_executed_at', ''),
  ('current_phase', '1'),
  ('max_total_quantity', '1000');

-- Create lottery results table
CREATE TABLE IF NOT EXISTS lottery_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_applications INTEGER NOT NULL,
  total_quantity_requested INTEGER NOT NULL,
  winners_count INTEGER NOT NULL,
  winners_quantity INTEGER NOT NULL,
  losers_count INTEGER NOT NULL,
  losers_quantity INTEGER NOT NULL,
  notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reservations_lottery_status ON reservations(lottery_status);
CREATE INDEX IF NOT EXISTS idx_reservations_phase ON reservations(reservation_phase);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
