-- Add pickup tracking fields
-- Migration: 0007_add_pickup_tracking
-- Created: 2026-02-27

-- Add pickup timestamp field
ALTER TABLE reservations ADD COLUMN picked_up_at TEXT;

-- Add pickup staff field (optional: track who processed the pickup)
ALTER TABLE reservations ADD COLUMN picked_up_by TEXT;

-- Create index for pickup tracking
CREATE INDEX IF NOT EXISTS idx_reservations_picked_up ON reservations(picked_up_at);

-- Update status comments
-- Status values:
-- 'reserved' - 予約済み（未受取）
-- 'picked_up' - 受取完了
-- 'cancelled' - キャンセル済み
