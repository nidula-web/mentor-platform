-- Add share_code column to mentors table
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;

-- Populate existing mentors with a random share_code if they don't have one
UPDATE mentors 
SET share_code = substring(md5(random()::text) from 1 for 8) 
WHERE share_code IS NULL;

-- Ensure share_code is not null for future inserts
ALTER TABLE mentors ALTER COLUMN share_code SET NOT NULL;
