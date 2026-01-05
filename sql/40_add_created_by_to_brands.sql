-- Add created_by column to brands table
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS created_by text DEFAULT 'Admin';

-- Update existing records to have 'Admin' if they are null (just in case)
UPDATE brands SET created_by = 'Admin' WHERE created_by IS NULL;
