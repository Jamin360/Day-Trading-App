-- ==================== FIX SIGNUP PROFILE CREATION ====================
-- This script:
-- 1. Drops the trigger causing race conditions and 500 errors
-- 2. Updates existing profiles with $0 balance to $100,000
-- 3. Verifies the table default is set correctly

-- Step 1: Drop the problematic trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Step 2: Make sure the table default is set to 100,000
ALTER TABLE profiles 
  ALTER COLUMN balance SET DEFAULT 100000.00;

-- Step 3: Update any existing profiles with $0 balance to $100,000
UPDATE profiles 
SET balance = 100000.00 
WHERE balance = 0 OR balance IS NULL;

-- Step 4: Verify the changes
SELECT 
  'Trigger dropped, defaults fixed, balances updated!' as status,
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE balance = 100000.00) as profiles_with_100k,
  COUNT(*) FILTER (WHERE balance = 0) as profiles_with_zero
FROM profiles;
