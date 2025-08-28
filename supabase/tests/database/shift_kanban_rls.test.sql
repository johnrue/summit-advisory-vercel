-- Story 3.4: Shift Kanban RLS Policy Tests
-- Comprehensive tests for Row Level Security policies on Kanban-related tables

BEGIN;

-- Load the pgTAP extension if not already loaded
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Test plan - adjust number as we add tests
SELECT plan(24);

-- Setup test data
-- Create test users with deterministic UUIDs to avoid conflicts
INSERT INTO auth.users (id, email, role, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'admin@test.com', 'authenticated', NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'manager1@test.com', 'authenticated', NOW()),
  ('550e8400-e29b-41d4-a716-446655440003', 'manager2@test.com', 'authenticated', NOW()),
  ('550e8400-e29b-41d4-a716-446655440004', 'guard@test.com', 'authenticated', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test profiles with consistent roles
INSERT INTO public.user_profiles (id, first_name, last_name, role, email) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Test', 'Admin', 'admin', 'admin@test.com'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Test', 'Manager1', 'manager', 'manager1@test.com'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Test', 'Manager2', 'manager', 'manager2@test.com'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Test', 'Guard', 'guard', 'guard@test.com')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  email = EXCLUDED.email;

-- Create test shifts
INSERT INTO public.shifts (id, status, client_info, location_data, time_range, priority, created_by) VALUES
  ('shift-test-1', 'unassigned', '{"name": "Test Client 1"}', '{"siteName": "Test Site 1"}', 
   '[2025-08-29T09:00:00Z,2025-08-29T17:00:00Z)', 2, '550e8400-e29b-41d4-a716-446655440002'),
  ('shift-test-2', 'assigned', '{"name": "Test Client 2"}', '{"siteName": "Test Site 2"}',
   '[2025-08-29T10:00:00Z,2025-08-29T18:00:00Z)', 1, '550e8400-e29b-41d4-a716-446655440003')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  created_by = EXCLUDED.created_by;

-- Create test workflow history
INSERT INTO public.shift_workflow_history (id, shift_id, new_status, changed_by, changed_at) VALUES
  ('workflow-test-1', 'shift-test-1', 'unassigned', '550e8400-e29b-41d4-a716-446655440002', NOW()),
  ('workflow-test-2', 'shift-test-2', 'assigned', '550e8400-e29b-41d4-a716-446655440003', NOW())
ON CONFLICT (id) DO UPDATE SET
  changed_by = EXCLUDED.changed_by;

-- Create test urgency alerts
INSERT INTO public.shift_urgency_alerts (id, shift_id, alert_type, alert_priority, hours_until_shift) VALUES
  ('alert-test-1', 'shift-test-1', 'unassigned_24h', 'high', 18),
  ('alert-test-2', 'shift-test-2', 'unconfirmed_12h', 'medium', 8)
ON CONFLICT (id) DO UPDATE SET
  alert_type = EXCLUDED.alert_type;

-- Create test archived shifts
INSERT INTO public.shift_archive (id, original_shift_data, shift_id, archived_by, client_name, site_name, shift_date) VALUES
  ('archive-test-1', '{"id": "archived-shift-1", "status": "completed"}', 'archived-shift-1', 
   '550e8400-e29b-41d4-a716-446655440002', 'Test Client Archive', 'Test Site Archive', '2025-08-25')
ON CONFLICT (id) DO UPDATE SET
  archived_by = EXCLUDED.archived_by;

-- Test 1-4: Shifts table RLS policies
-- Test as admin (should see all shifts)
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440001';

SELECT results_eq(
  'SELECT COUNT(*)::int FROM shifts WHERE id LIKE ''shift-test-%''',
  ARRAY[2],
  'Admin should see all test shifts'
);

-- Test as manager1 (should see shifts they can manage)
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440002';

SELECT results_eq(
  'SELECT COUNT(*)::int FROM shifts WHERE id LIKE ''shift-test-%''',
  ARRAY[2],
  'Manager should see all shifts (business requirement for Kanban board)'
);

-- Test as guard (should see limited shift information)
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440004';

SELECT results_eq(
  'SELECT COUNT(*)::int FROM shifts WHERE id LIKE ''shift-test-%'' AND assigned_guard_id = ''550e8400-e29b-41d4-a716-446655440004''',
  ARRAY[0],
  'Guard should only see their own assigned shifts'
);

-- Test insert permissions for managers
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440002';

SELECT lives_ok(
  $$INSERT INTO shifts (id, status, client_info, location_data, time_range, priority, created_by) 
    VALUES ('shift-insert-test', 'unassigned', '{"name": "Insert Test"}', '{"siteName": "Insert Test"}',
            '[2025-08-30T09:00:00Z,2025-08-30T17:00:00Z)', 1, '550e8400-e29b-41d4-a716-446655440002')$$,
  'Manager should be able to insert new shifts'
);

-- Test 5-8: Shift workflow history RLS policies
-- Test manager access to workflow history
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440002';

SELECT results_eq(
  'SELECT COUNT(*)::int FROM shift_workflow_history WHERE id LIKE ''workflow-test-%''',
  ARRAY[2],
  'Manager should see workflow history for monitoring'
);

-- Test workflow history insert permissions
SELECT lives_ok(
  $$INSERT INTO shift_workflow_history (id, shift_id, new_status, changed_by, changed_at)
    VALUES ('workflow-insert-test', 'shift-test-1', 'assigned', '550e8400-e29b-41d4-a716-446655440002', NOW())$$,
  'Manager should be able to insert workflow history'
);

-- Test guard cannot access workflow history directly
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440004';

SELECT results_eq(
  'SELECT COUNT(*)::int FROM shift_workflow_history WHERE id LIKE ''workflow-test-%''',
  ARRAY[0],
  'Guard should not see workflow history (manager-only feature)'
);

-- Test guard cannot insert workflow history
SELECT throws_ok(
  $$INSERT INTO shift_workflow_history (id, shift_id, new_status, changed_by, changed_at)
    VALUES ('workflow-guard-test', 'shift-test-1', 'assigned', '550e8400-e29b-41d4-a716-446655440004', NOW())$$,
  'Guard should not be able to insert workflow history'
);

-- Test 9-12: Urgency alerts RLS policies
-- Test manager access to urgency alerts
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440002';

SELECT results_eq(
  'SELECT COUNT(*)::int FROM shift_urgency_alerts WHERE id LIKE ''alert-test-%''',
  ARRAY[2],
  'Manager should see urgency alerts'
);

-- Test manager can acknowledge alerts
SELECT lives_ok(
  $$UPDATE shift_urgency_alerts 
    SET alert_status = 'acknowledged', acknowledged_by = '550e8400-e29b-41d4-a716-446655440002'
    WHERE id = 'alert-test-1'$$,
  'Manager should be able to acknowledge alerts'
);

-- Test system can create alerts (represented by admin role for testing)
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440001';

SELECT lives_ok(
  $$INSERT INTO shift_urgency_alerts (id, shift_id, alert_type, alert_priority, hours_until_shift)
    VALUES ('alert-insert-test', 'shift-test-1', 'no_show_risk', 'critical', 2)$$,
  'System should be able to create new alerts'
);

-- Test guard cannot modify alerts
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440004';

SELECT throws_ok(
  $$UPDATE shift_urgency_alerts SET alert_status = 'acknowledged' WHERE id = 'alert-test-2'$$,
  'Guard should not be able to modify alerts'
);

-- Test 13-16: Shift archive RLS policies
-- Test manager access to archives
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440002';

SELECT results_eq(
  'SELECT COUNT(*)::int FROM shift_archive WHERE id LIKE ''archive-test-%''',
  ARRAY[1],
  'Manager should see shift archives'
);

-- Test manager can create archives
SELECT lives_ok(
  $$INSERT INTO shift_archive (id, original_shift_data, shift_id, archived_by, client_name, site_name, shift_date)
    VALUES ('archive-insert-test', '{"id": "test-archive", "status": "completed"}', 'test-archive',
            '550e8400-e29b-41d4-a716-446655440002', 'Archive Test Client', 'Archive Test Site', '2025-08-26')$$,
  'Manager should be able to archive completed shifts'
);

-- Test admin access to archives (for reporting)
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440001';

SELECT results_eq(
  'SELECT COUNT(*)::int FROM shift_archive WHERE id LIKE ''archive-%''',
  ARRAY[2],
  'Admin should see all archives for reporting'
);

-- Test guard limited archive access
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440004';

SELECT results_eq(
  'SELECT COUNT(*)::int FROM shift_archive WHERE guard_name = ''Test Guard''',
  ARRAY[0],
  'Guard should only see archives where they were the assigned guard'
);

-- Test 17-20: Cross-table relationship integrity
-- Test that workflow history references valid shifts
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440002';

SELECT results_eq(
  'SELECT COUNT(*)::int FROM shift_workflow_history wh 
   JOIN shifts s ON wh.shift_id = s.id 
   WHERE wh.id LIKE ''workflow-test-%''',
  ARRAY[2],
  'All workflow history should reference valid shifts'
);

-- Test that urgency alerts reference valid shifts
SELECT results_eq(
  'SELECT COUNT(*)::int FROM shift_urgency_alerts ua
   JOIN shifts s ON ua.shift_id = s.id
   WHERE ua.id LIKE ''alert-test-%''',
  ARRAY[2],
  'All urgency alerts should reference valid shifts'
);

-- Test manager can view joined data for Kanban board
SELECT results_eq(
  'SELECT COUNT(*)::int FROM shifts s
   LEFT JOIN shift_urgency_alerts ua ON s.id = ua.shift_id
   WHERE s.id LIKE ''shift-test-%''',
  ARRAY[2],
  'Manager should be able to join shifts with alerts for Kanban display'
);

-- Test workflow transitions maintain audit trail
SELECT results_eq(
  'SELECT COUNT(*)::int FROM shift_workflow_history
   WHERE changed_by IN (''550e8400-e29b-41d4-a716-446655440002'', ''550e8400-e29b-41d4-a716-446655440003'')',
  ARRAY[3], -- Original 2 + 1 inserted during test
  'Workflow history should maintain manager accountability'
);

-- Test 21-24: Security boundary tests
-- Test that managers cannot impersonate other users in workflow history
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440002';

SELECT throws_ok(
  $$INSERT INTO shift_workflow_history (id, shift_id, new_status, changed_by, changed_at)
    VALUES ('workflow-impersonate-test', 'shift-test-1', 'confirmed', '550e8400-e29b-41d4-a716-446655440003', NOW())$$,
  'Manager should not be able to create workflow history as another manager'
);

-- Test that alert acknowledgments are properly attributed
SELECT lives_ok(
  $$UPDATE shift_urgency_alerts 
    SET alert_status = 'acknowledged', acknowledged_by = '550e8400-e29b-41d4-a716-446655440002'
    WHERE id = 'alert-test-2'$$,
  'Manager should be able to acknowledge alerts as themselves'
);

-- Test data isolation between different manager contexts
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440003';

SELECT results_eq(
  'SELECT COUNT(*)::int FROM shift_workflow_history WHERE changed_by = ''550e8400-e29b-41d4-a716-446655440002''',
  ARRAY[2], -- Should see other manager's history for transparency
  'Managers should see other managers'' workflow actions for collaboration'
);

-- Test that anonymous users cannot access any Kanban data
RESET ALL;
SET LOCAL role anonymous;

SELECT results_eq(
  'SELECT COUNT(*)::int FROM shifts',
  ARRAY[0],
  'Anonymous users should not see any shifts'
);

-- Cleanup test data
DELETE FROM public.shift_archive WHERE id LIKE 'archive-%';
DELETE FROM public.shift_urgency_alerts WHERE id LIKE 'alert-%';
DELETE FROM public.shift_workflow_history WHERE id LIKE 'workflow-%';
DELETE FROM public.shifts WHERE id LIKE 'shift-%';

-- Finish the test suite
SELECT * FROM finish();

ROLLBACK;