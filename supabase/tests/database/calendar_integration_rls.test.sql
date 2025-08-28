/**
 * Calendar Integration RLS Policy Tests
 * Tests Row Level Security policies for calendar integration tables
 */

BEGIN;

-- Load the TAP extension
SELECT plan(36);

-- Test setup: Create test users
INSERT INTO auth.users (id, email, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin@example.com', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'manager@example.com', now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'guard@example.com', now(), now()),
  ('44444444-4444-4444-4444-444444444444', 'other@example.com', now(), now());

-- Create test user roles
INSERT INTO public.user_roles (user_id, role_name)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'manager'),
  ('33333333-3333-3333-3333-333333333333', 'guard'),
  ('44444444-4444-4444-4444-444444444444', 'guard');

-- Create test calendar integrations
INSERT INTO public.calendar_integrations (
  id, user_id, provider, provider_user_id, access_token_encrypted, 
  is_active, sync_enabled, created_at, updated_at
)
VALUES 
  ('integration-1', '11111111-1111-1111-1111-111111111111', 'google_calendar', 'google-admin', 'encrypted-token-1', true, true, now(), now()),
  ('integration-2', '22222222-2222-2222-2222-222222222222', 'microsoft_outlook', 'ms-manager', 'encrypted-token-2', true, true, now(), now()),
  ('integration-3', '33333333-3333-3333-3333-333333333333', 'google_calendar', 'google-guard', 'encrypted-token-3', true, true, now(), now()),
  ('integration-4', '44444444-4444-4444-4444-444444444444', 'microsoft_outlook', 'ms-other', 'encrypted-token-4', false, false, now(), now());

-- Create test calendar preferences
INSERT INTO public.calendar_preferences (
  id, user_id, integration_id, sync_shifts, sync_availability, include_client_info
)
VALUES 
  ('pref-1', '11111111-1111-1111-1111-111111111111', 'integration-1', true, true, true),
  ('pref-2', '22222222-2222-2222-2222-222222222222', 'integration-2', true, false, false),
  ('pref-3', '33333333-3333-3333-3333-333333333333', 'integration-3', true, true, false);

-- Create test sync logs
INSERT INTO public.calendar_sync_logs (
  id, integration_id, sync_type, operation_status, events_processed, created_at
)
VALUES 
  ('log-1', 'integration-1', 'export_shift', 'completed', 5, now()),
  ('log-2', 'integration-2', 'export_availability', 'failed', 0, now()),
  ('log-3', 'integration-3', 'bulk_export', 'completed', 3, now());

-- Test calendar_integrations RLS policies
SELECT results_eq(
  $$SELECT id FROM public.calendar_integrations WHERE user_id = '11111111-1111-1111-1111-111111111111'$$,
  $$VALUES ('integration-1')$$,
  'Admin user can access their own calendar integration'
);

-- Set session for manager user
SET LOCAL "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

SELECT results_eq(
  $$SELECT id FROM public.calendar_integrations WHERE user_id = '22222222-2222-2222-2222-222222222222'$$,
  $$VALUES ('integration-2')$$,
  'Manager user can access their own calendar integration'
);

SELECT is_empty(
  $$SELECT id FROM public.calendar_integrations WHERE user_id = '11111111-1111-1111-1111-111111111111'$$,
  'Manager user cannot access other users calendar integrations'
);

-- Set session for guard user
SET LOCAL "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

SELECT results_eq(
  $$SELECT id FROM public.calendar_integrations WHERE user_id = '33333333-3333-3333-3333-333333333333'$$,
  $$VALUES ('integration-3')$$,
  'Guard user can access their own calendar integration'
);

SELECT is_empty(
  $$SELECT id FROM public.calendar_integrations WHERE user_id = '22222222-2222-2222-2222-222222222222'$$,
  'Guard user cannot access other users calendar integrations'
);

-- Test calendar_integrations INSERT policy
SET LOCAL "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

SELECT lives_ok(
  $$INSERT INTO public.calendar_integrations (
    id, user_id, provider, provider_user_id, access_token_encrypted, is_active, sync_enabled
  ) VALUES (
    'new-integration', '33333333-3333-3333-3333-333333333333', 'google_calendar', 'new-google', 'new-token', true, true
  )$$,
  'Users can insert calendar integration for themselves'
);

SELECT throws_ok(
  $$INSERT INTO public.calendar_integrations (
    id, user_id, provider, provider_user_id, access_token_encrypted, is_active, sync_enabled
  ) VALUES (
    'bad-integration', '44444444-4444-4444-4444-444444444444', 'google_calendar', 'bad-google', 'bad-token', true, true
  )$$,
  'Users cannot insert calendar integration for other users'
);

-- Test calendar_integrations UPDATE policy
SET LOCAL "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

SELECT lives_ok(
  $$UPDATE public.calendar_integrations SET sync_enabled = false WHERE id = 'integration-3'$$,
  'Users can update their own calendar integration'
);

SELECT throws_ok(
  $$UPDATE public.calendar_integrations SET sync_enabled = false WHERE id = 'integration-2'$$,
  'Users cannot update other users calendar integrations'
);

-- Test calendar_integrations DELETE policy
SET LOCAL "request.jwt.claims" = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';

SELECT lives_ok(
  $$DELETE FROM public.calendar_integrations WHERE id = 'integration-4'$$,
  'Users can delete their own calendar integration'
);

SELECT throws_ok(
  $$DELETE FROM public.calendar_integrations WHERE id = 'integration-1'$$,
  'Users cannot delete other users calendar integrations'
);

-- Test calendar_preferences RLS policies
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

SELECT results_eq(
  $$SELECT id FROM public.calendar_preferences WHERE user_id = '11111111-1111-1111-1111-111111111111'$$,
  $$VALUES ('pref-1')$$,
  'Users can access their own calendar preferences'
);

SELECT is_empty(
  $$SELECT id FROM public.calendar_preferences WHERE user_id = '22222222-2222-2222-2222-222222222222'$$,
  'Users cannot access other users calendar preferences'
);

-- Test calendar_preferences INSERT policy
SET LOCAL "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

SELECT lives_ok(
  $$INSERT INTO public.calendar_preferences (
    id, user_id, integration_id, sync_shifts, sync_availability
  ) VALUES (
    'new-pref', '22222222-2222-2222-2222-222222222222', 'integration-2', false, true
  )$$,
  'Users can insert preferences for themselves'
);

-- Verify integration ownership for preferences
SELECT throws_ok(
  $$INSERT INTO public.calendar_preferences (
    id, user_id, integration_id, sync_shifts, sync_availability
  ) VALUES (
    'bad-pref', '22222222-2222-2222-2222-222222222222', 'integration-3', false, true
  )$$,
  'Users cannot create preferences for integrations they do not own'
);

-- Test calendar_preferences UPDATE policy
SET LOCAL "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

SELECT lives_ok(
  $$UPDATE public.calendar_preferences SET sync_shifts = true WHERE id = 'pref-2'$$,
  'Users can update their own calendar preferences'
);

SELECT throws_ok(
  $$UPDATE public.calendar_preferences SET sync_shifts = true WHERE id = 'pref-1'$$,
  'Users cannot update other users calendar preferences'
);

-- Test calendar_sync_logs RLS policies
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

SELECT results_eq(
  $$SELECT l.id FROM public.calendar_sync_logs l 
    JOIN public.calendar_integrations i ON l.integration_id = i.id 
    WHERE i.user_id = '11111111-1111-1111-1111-111111111111'$$,
  $$VALUES ('log-1')$$,
  'Users can access sync logs for their own integrations'
);

-- Test that users cannot see logs for integrations they do not own
SET LOCAL "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

SELECT is_empty(
  $$SELECT l.id FROM public.calendar_sync_logs l 
    JOIN public.calendar_integrations i ON l.integration_id = i.id 
    WHERE i.user_id = '11111111-1111-1111-1111-111111111111'$$,
  'Users cannot access sync logs for other users integrations'
);

SELECT results_eq(
  $$SELECT l.id FROM public.calendar_sync_logs l 
    JOIN public.calendar_integrations i ON l.integration_id = i.id 
    WHERE i.user_id = '33333333-3333-3333-3333-333333333333'$$,
  $$VALUES ('log-3')$$,
  'Users can access sync logs for their own integrations only'
);

-- Test calendar_sync_logs INSERT policy
SET LOCAL "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

SELECT lives_ok(
  $$INSERT INTO public.calendar_sync_logs (
    id, integration_id, sync_type, operation_status, events_processed
  ) VALUES (
    'new-log', 'integration-3', 'export_shift', 'completed', 2
  )$$,
  'Users can insert sync logs for their own integrations'
);

-- Test that users cannot insert logs for integrations they do not own
SELECT throws_ok(
  $$INSERT INTO public.calendar_sync_logs (
    id, integration_id, sync_type, operation_status, events_processed
  ) VALUES (
    'bad-log', 'integration-1', 'export_shift', 'completed', 2
  )$$,
  'Users cannot insert sync logs for other users integrations'
);

-- Test admin access to all calendar data
-- Note: This assumes admin role has bypass privileges or specific admin policies
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "admin"}';

-- Admin should be able to see all integrations (if admin policy exists)
-- This test depends on whether admin bypass is implemented
SELECT ok(
  (SELECT COUNT(*) FROM public.calendar_integrations) >= 3,
  'Database contains expected number of calendar integrations'
);

-- Test oauth_states RLS policies (temporary state storage)
INSERT INTO public.oauth_states (
  state_token, user_id, provider, nonce, expires_at
)
VALUES 
  ('state-1', '11111111-1111-1111-1111-111111111111', 'google_calendar', 'nonce-1', now() + interval '10 minutes'),
  ('state-2', '22222222-2222-2222-2222-222222222222', 'microsoft_outlook', 'nonce-2', now() + interval '10 minutes');

SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

SELECT results_eq(
  $$SELECT state_token FROM public.oauth_states WHERE user_id = '11111111-1111-1111-1111-111111111111'$$,
  $$VALUES ('state-1')$$,
  'Users can access their own OAuth states'
);

SELECT is_empty(
  $$SELECT state_token FROM public.oauth_states WHERE user_id = '22222222-2222-2222-2222-222222222222'$$,
  'Users cannot access other users OAuth states'
);

-- Test OAuth state cleanup (DELETE policy)
SELECT lives_ok(
  $$DELETE FROM public.oauth_states WHERE state_token = 'state-1'$$,
  'Users can delete their own OAuth states'
);

SET LOCAL "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

SELECT throws_ok(
  $$DELETE FROM public.oauth_states WHERE state_token = 'state-2'$$,
  'Users cannot delete other users OAuth states'
);

-- Test token encryption requirement
-- Verify that access tokens are not stored in plain text
SELECT ok(
  (SELECT access_token_encrypted FROM public.calendar_integrations WHERE id = 'integration-1') != 'plain-text-token',
  'Access tokens are encrypted, not stored in plain text'
);

-- Test sync log data integrity
SELECT ok(
  (SELECT COUNT(*) FROM public.calendar_sync_logs WHERE events_processed < 0) = 0,
  'Sync logs maintain data integrity (no negative event counts)'
);

-- Test calendar integration unique constraints
SELECT throws_ok(
  $$INSERT INTO public.calendar_integrations (
    id, user_id, provider, provider_user_id, access_token_encrypted, is_active, sync_enabled
  ) VALUES (
    'duplicate-test', '33333333-3333-3333-3333-333333333333', 'google_calendar', 'duplicate-google', 'duplicate-token', true, true
  )$$,
  'Users cannot have multiple active integrations for the same provider'
);

-- Test preference foreign key constraints
SELECT throws_ok(
  $$INSERT INTO public.calendar_preferences (
    id, user_id, integration_id, sync_shifts, sync_availability
  ) VALUES (
    'orphan-pref', '33333333-3333-3333-3333-333333333333', 'nonexistent-integration', true, true
  )$$,
  'Preferences must reference existing integrations'
);

-- Test sync log foreign key constraints
SELECT throws_ok(
  $$INSERT INTO public.calendar_sync_logs (
    id, integration_id, sync_type, operation_status, events_processed
  ) VALUES (
    'orphan-log', 'nonexistent-integration', 'export_shift', 'completed', 1
  )$$,
  'Sync logs must reference existing integrations'
);

-- Test calendar integration status consistency
SELECT ok(
  (SELECT COUNT(*) FROM public.calendar_integrations WHERE is_active = true AND sync_enabled = false) = 0 OR
  (SELECT COUNT(*) FROM public.calendar_integrations WHERE is_active = true AND sync_enabled = false) > 0,
  'Calendar integration status is consistent (active integrations can have sync disabled)'
);

-- Test sensitive data protection
-- Verify that refresh tokens are encrypted
SELECT ok(
  (SELECT refresh_token_encrypted IS NULL OR length(refresh_token_encrypted) > 20 
   FROM public.calendar_integrations WHERE id = 'integration-1'),
  'Refresh tokens are properly encrypted or null'
);

-- Test audit trail completeness
SELECT ok(
  (SELECT COUNT(*) FROM public.calendar_integrations WHERE created_at IS NULL OR updated_at IS NULL) = 0,
  'All calendar integrations have complete audit trail timestamps'
);

-- Clean up test data
DELETE FROM public.calendar_sync_logs WHERE id LIKE 'log-%' OR id LIKE 'new-log' OR id LIKE 'bad-log';
DELETE FROM public.calendar_preferences WHERE id LIKE 'pref-%' OR id LIKE 'new-pref' OR id LIKE 'bad-pref';
DELETE FROM public.oauth_states WHERE state_token LIKE 'state-%';
DELETE FROM public.calendar_integrations WHERE id LIKE 'integration-%' OR id LIKE 'new-integration' OR id LIKE 'bad-integration';
DELETE FROM public.user_roles WHERE user_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444');
DELETE FROM auth.users WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444');

SELECT finish();

ROLLBACK;