-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS public.user_role AS $$
DECLARE
    user_role_result public.user_role;
BEGIN
    SELECT role INTO user_role_result
    FROM public.user_roles
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(user_role_result, 'guard'); -- Default to guard if no role found
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific role or higher
CREATE OR REPLACE FUNCTION public.user_has_role(
    required_role public.user_role,
    user_uuid UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
DECLARE
    current_role public.user_role;
    role_hierarchy INTEGER;
    required_hierarchy INTEGER;
BEGIN
    current_role := public.get_user_role(user_uuid);
    
    -- Define role hierarchy (higher number = more permissions)
    role_hierarchy := CASE current_role
        WHEN 'client' THEN 1
        WHEN 'guard' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'admin' THEN 4
        ELSE 0
    END;
    
    required_hierarchy := CASE required_role
        WHEN 'client' THEN 1
        WHEN 'guard' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'admin' THEN 4
        ELSE 0
    END;
    
    RETURN role_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign role to user (only admins can use)
CREATE OR REPLACE FUNCTION public.assign_user_role(
    target_user_id UUID,
    new_role public.user_role,
    permissions_data JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
    -- Check if current user is admin
    IF NOT public.user_has_role('admin') THEN
        RAISE EXCEPTION 'Insufficient permissions to assign roles';
    END IF;
    
    -- Insert or update user role
    INSERT INTO public.user_roles (user_id, role, permissions, created_by)
    VALUES (target_user_id, new_role, permissions_data, auth.uid())
    ON CONFLICT (user_id)
    DO UPDATE SET
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        updated_at = NOW(),
        created_by = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default role for new users
CREATE OR REPLACE FUNCTION public.create_default_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default guard role for new users
    INSERT INTO public.user_roles (user_id, role, permissions)
    VALUES (
        NEW.id,
        COALESCE(
            (NEW.raw_user_meta_data->>'role')::public.user_role,
            'guard'
        ),
        '{}'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default role when user signs up
CREATE TRIGGER create_user_role_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_user_role();