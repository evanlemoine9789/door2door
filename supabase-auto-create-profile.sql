-- Database function to automatically create user_profiles when a new user signs up
-- This runs with elevated privileges and bypasses RLS

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Create the function to automatically create user profile and organization
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    org_name TEXT;
    user_full_name TEXT;
BEGIN
    -- Get organization name from metadata, default to user's email if not provided
    org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.email || '''s Organization');
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
    
    -- Create organization
    INSERT INTO public.organizations (name, owner_id)
    VALUES (org_name, NEW.id)
    RETURNING id INTO new_org_id;
    
    -- Create user profile linked to the new organization
    INSERT INTO public.user_profiles (id, email, full_name, organization_id, role)
    VALUES (
        NEW.id,
        NEW.email,
        user_full_name,
        new_org_id,
        'owner' -- First user is the owner of their organization
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

