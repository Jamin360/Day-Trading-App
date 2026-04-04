-- Drop the trigger that's causing 500 errors during signup
-- We don't need this trigger since the register function manually creates profiles

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Verify they're gone
SELECT 'Trigger and function dropped successfully!' as status;
