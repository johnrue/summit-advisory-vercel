-- Enhanced RLS policies that integrate with the permission matrix system
-- These policies use the permission checking functions for fine-grained access control

-- Drop existing restrictive policies to replace with permission-based ones
DROP POLICY IF EXISTS "Managers can view guard and client roles" ON public.user_roles;

-- Enhanced policy: Role-based access with permission checking
CREATE POLICY "Permission-based user role access" 
ON public.user_roles 
FOR SELECT 
USING (
    -- Users can always view their own role
    auth.uid() = user_id 
    OR 
    -- Users with users.view_all permission can view all roles
    public.user_has_permission(auth.uid(), 'users.view_all')
    OR
    -- Managers can view subordinate roles (guards and clients) even without view_all
    (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('manager', 'admin')
        )
        AND role IN ('guard', 'client')
    )
);

-- Enhanced policy: Permission-based role modification
-- Replace the existing admin-only policy with permission-based access
DROP POLICY IF EXISTS "Only admins can modify user roles" ON public.user_roles;

CREATE POLICY "Permission-based role modification" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
    public.user_has_permission(auth.uid(), 'users.create')
);

CREATE POLICY "Permission-based role updates" 
ON public.user_roles 
FOR UPDATE 
USING (
    public.user_has_permission(auth.uid(), 'users.edit')
)
WITH CHECK (
    public.user_has_permission(auth.uid(), 'users.edit')
);

CREATE POLICY "Permission-based role deletion" 
ON public.user_roles 
FOR DELETE 
USING (
    public.user_has_permission(auth.uid(), 'users.delete')
);

-- Enhanced audit log policies with permission integration
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

CREATE POLICY "Permission-based audit log access" 
ON public.audit_logs 
FOR SELECT 
USING (
    -- Users can view their own audit logs
    changed_by = auth.uid() 
    OR 
    (
        table_name = 'user_roles' 
        AND record_id IN (
            SELECT id FROM public.user_roles 
            WHERE user_id = auth.uid()
        )
    )
    OR
    -- Users with audit access permission can view all logs
    public.user_has_permission(auth.uid(), 'system.view_audit_logs')
);

-- Function to validate permission hierarchy during role assignments
CREATE OR REPLACE FUNCTION public.validate_role_assignment()
RETURNS TRIGGER AS $$
DECLARE
    assigner_role public.user_role;
    target_role public.user_role;
    role_hierarchy JSONB;
BEGIN
    -- Get the role of the user making the assignment
    SELECT role INTO assigner_role
    FROM public.user_roles
    WHERE user_id = auth.uid();
    
    -- Get the target role being assigned
    target_role := NEW.role;
    
    -- Role hierarchy levels (higher number = higher privilege)
    role_hierarchy := '{
        "client": 1,
        "guard": 2, 
        "manager": 3,
        "admin": 4
    }'::jsonb;
    
    -- Only allow role assignment if assigner has higher or equal privilege
    -- Admins can assign any role, managers can assign guard/client, etc.
    IF (role_hierarchy->assigner_role::text)::int < (role_hierarchy->target_role::text)::int THEN
        RAISE EXCEPTION 'Insufficient privileges to assign role: %', target_role;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to validate role assignments
DROP TRIGGER IF EXISTS validate_role_assignment_trigger ON public.user_roles;
CREATE TRIGGER validate_role_assignment_trigger
    BEFORE INSERT OR UPDATE OF role ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_role_assignment();

-- Create index on permissions JSONB for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_permissions_gin ON public.user_roles USING gin (permissions);

-- Add policy for users to update their own non-role information
CREATE POLICY "Users can update own non-role data" 
ON public.user_roles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
    auth.uid() = user_id 
    AND OLD.role = NEW.role  -- Prevent role self-modification
    AND OLD.user_id = NEW.user_id  -- Prevent user_id modification
);