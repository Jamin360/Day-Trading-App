-- Drop the handle_new_user trigger completely
-- This trigger interferes with profile creation in the register function

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Verify it's gone
SELECT 
  'Trigger dropped successfully!' as status,
  (SELECT COUNT(*) FROM information_schema.triggers 
   WHERE trigger_name = 'on_auth_user_created') as trigger_count,
  (SELECT COUNT(*) FROM information_schema.routines 
   WHERE routine_name = 'handle_new_user') as function_count;
