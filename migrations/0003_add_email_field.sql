-- Add email field to reservations table
ALTER TABLE reservations ADD COLUMN email TEXT;

-- Create index for email searches
CREATE INDEX IF NOT EXISTS idx_reservations_email ON reservations(email);
