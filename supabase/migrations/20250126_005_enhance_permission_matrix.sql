-- Enhance permission matrix structure with standardized permissions
-- This migration adds helper functions and default permission matrices

-- Function to get default permissions for each role
CREATE OR REPLACE FUNCTION public.get_default_permissions(role_type public.user_role)
RETURNS JSONB AS $$
BEGIN
    RETURN CASE role_type
        WHEN 'admin' THEN '{
            "users": {
                "view_all": true,
                "create": true,
                "edit": true,
                "delete": true
            },
            "guards": {
                "view_all": true,
                "edit_profiles": true,
                "assign_shifts": true,
                "manage_applications": true
            },
            "shifts": {
                "view_all": true,
                "create": true,
                "edit": true,
                "assign": true
            },
            "system": {
                "view_audit_logs": true,
                "manage_roles": true,
                "system_config": true
            },
            "leads": {
                "view_all": true,
                "create": true,
                "edit": true,
                "assign": true
            },
            "compliance": {
                "view_all": true,
                "manage_reports": true,
                "audit_access": true
            }
        }'::jsonb
        WHEN 'manager' THEN '{
            "users": {
                "view_all": false,
                "create": false,
                "edit": false,
                "delete": false
            },
            "guards": {
                "view_all": true,
                "edit_profiles": true,
                "assign_shifts": true,
                "manage_applications": true
            },
            "shifts": {
                "view_all": true,
                "create": true,
                "edit": true,
                "assign": true
            },
            "system": {
                "view_audit_logs": false,
                "manage_roles": false,
                "system_config": false
            },
            "leads": {
                "view_all": true,
                "create": true,
                "edit": true,
                "assign": true
            },
            "compliance": {
                "view_all": true,
                "manage_reports": false,
                "audit_access": false
            }
        }'::jsonb
        WHEN 'guard' THEN '{
            "users": {
                "view_all": false,
                "create": false,
                "edit": false,
                "delete": false
            },
            "guards": {
                "view_all": false,
                "edit_profiles": false,
                "assign_shifts": false,
                "manage_applications": false
            },
            "shifts": {
                "view_all": false,
                "create": false,
                "edit": false,
                "assign": false
            },
            "system": {
                "view_audit_logs": false,
                "manage_roles": false,
                "system_config": false
            },
            "leads": {
                "view_all": false,
                "create": false,
                "edit": false,
                "assign": false
            },
            "compliance": {
                "view_all": false,
                "manage_reports": false,
                "audit_access": false
            }
        }'::jsonb
        WHEN 'client' THEN '{
            "users": {
                "view_all": false,
                "create": false,
                "edit": false,
                "delete": false
            },
            "guards": {
                "view_all": false,
                "edit_profiles": false,
                "assign_shifts": false,
                "manage_applications": false
            },
            "shifts": {
                "view_all": false,
                "create": false,
                "edit": false,
                "assign": false
            },
            "system": {
                "view_audit_logs": false,
                "manage_roles": false,
                "system_config": false
            },
            "leads": {
                "view_all": false,
                "create": false,
                "edit": false,
                "assign": false
            },
            "compliance": {
                "view_all": false,
                "manage_reports": false,
                "audit_access": false
            }
        }'::jsonb
        ELSE '{}'::jsonb
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update existing user permissions to new matrix structure
CREATE OR REPLACE FUNCTION public.upgrade_user_permissions()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    user_record RECORD;
BEGIN
    -- Update all existing user records with default permissions if they have empty permissions
    FOR user_record IN 
        SELECT id, user_id, role, permissions
        FROM public.user_roles
        WHERE permissions = '{}'::jsonb OR permissions IS NULL
    LOOP
        UPDATE public.user_roles
        SET permissions = public.get_default_permissions(user_record.role),
            updated_at = NOW()
        WHERE id = user_record.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(user_id_param UUID, permission_path TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_permissions JSONB;
    permission_parts TEXT[];
    current_level JSONB;
    i INTEGER;
BEGIN
    -- Get user permissions
    SELECT permissions INTO user_permissions
    FROM public.user_roles
    WHERE user_id = user_id_param;
    
    -- Return false if no permissions found
    IF user_permissions IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Split permission path (e.g., "users.view_all" -> ["users", "view_all"])
    permission_parts := string_to_array(permission_path, '.');
    current_level := user_permissions;
    
    -- Navigate through permission path
    FOR i IN 1..array_length(permission_parts, 1) LOOP
        IF current_level ? permission_parts[i] THEN
            current_level := current_level -> permission_parts[i];
        ELSE
            RETURN FALSE;
        END IF;
    END LOOP;
    
    -- Return boolean value or false if not boolean
    RETURN CASE 
        WHEN jsonb_typeof(current_level) = 'boolean' THEN 
            current_level::boolean
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Trigger to automatically assign default permissions when role is created/updated
CREATE OR REPLACE FUNCTION public.ensure_default_permissions()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update permissions if they're empty or if role has changed
    IF (TG_OP = 'INSERT' AND (NEW.permissions = '{}'::jsonb OR NEW.permissions IS NULL)) OR
       (TG_OP = 'UPDATE' AND NEW.role != OLD.role) THEN
        NEW.permissions := public.get_default_permissions(NEW.role);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_user_role_permissions
    BEFORE INSERT OR UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_default_permissions();

-- Apply upgrades to existing data
SELECT public.upgrade_user_permissions();