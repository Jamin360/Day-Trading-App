-- ==================== COMPREHENSIVE FIX FOR $0 BALANCE ISSUE ====================
-- This script will fix ALL possible causes of the $0 balance problem
-- Run this ENTIRE script in your Supabase SQL Editor

-- =============================================================================
-- STEP 1: DROP THE TRIGGER (it's causing race conditions)
-- =============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

SELECT 'Step 1: Trigger and function dropped' as status;

-- =============================================================================
-- STEP 2: ENSURE TABLE DEFAULT IS CORRECT
-- =============================================================================
ALTER TABLE profiles 
  ALTER COLUMN balance SET DEFAULT 100000.00;

SELECT 'Step 2: Table default set to 100000.00' as status;

-- =============================================================================
-- STEP 3: UPDATE ALL EXISTING PROFILES WITH $0 TO $100,000
-- =============================================================================
UPDATE profiles 
SET balance = 100000.00 
WHERE balance = 0 OR balance < 100;

SELECT 'Step 3: Updated profiles with low balances' as status;

-- =============================================================================
-- STEP 4: FIX RLS POLICIES TO ALLOW UPSERT
-- =============================================================================

-- Drop and recreate INSERT policy to ensure it works with UPSERT
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Add UPDATE policy to allow UPSERT to update existing profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

SELECT 'Step 4: RLS policies configured for UPSERT' as status;

-- =============================================================================
-- STEP 5: VERIFY EVERYTHING IS CORRECT
-- =============================================================================
SELECT 
  'ALL FIXES APPLIED!' as status,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM profiles WHERE balance >= 100000) as profiles_with_100k,
  (SELECT COUNT(*) FROM profiles WHERE balance < 100) as profiles_with_low_balance,
  (SELECT column_default FROM information_schema.columns 
   WHERE table_name = 'profiles' AND column_name = 'balance') as table_default,
  (SELECT COUNT(*) FROM information_schema.triggers 
   WHERE trigger_name = 'on_auth_user_created') as trigger_exists;
