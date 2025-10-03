-- First, drop the old accounting_category type and recreate with only studio-relevant categories
DROP TYPE IF EXISTS accounting_category CASCADE;

-- Create new accounting_category enum with only photography/videography studio relevant categories
CREATE TYPE accounting_category AS ENUM (
  'Cameras',
  'Lenses',
  'Lighting Equipment',
  'Audio Equipment',
  'Drones',
  'Stabilizers & Gimbals',
  'Tripods & Stands',
  'Storage & Backup',
  'Computer & Software',
  'Office Equipment',
  'Vehicles',
  'Studio Rent',
  'Utilities',
  'Marketing',
  'Insurance',
  'Maintenance',
  'Travel',
  'Staff Salary',
  'Freelancer Payment',
  'Bank Charges',
  'Taxes',
  'Loan & EMI',
  'Event Revenue',
  'Other Income',
  'Other Expense',
  'Custom'
);

-- Update accounting_entries table to add the category back and change entry_type
ALTER TABLE accounting_entries 
  DROP COLUMN IF EXISTS category,
  ADD COLUMN category accounting_category NOT NULL DEFAULT 'Custom',
  ALTER COLUMN entry_type TYPE text,
  ALTER COLUMN entry_type SET DEFAULT 'Credit';

-- Add comment to clarify entry types
COMMENT ON COLUMN accounting_entries.entry_type IS 'Entry type: Credit (money in), Debit (money out), or Assets (asset purchases/investments)';