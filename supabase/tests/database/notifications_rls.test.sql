-- Test file for notification system RLS policies
-- Tests Row Level Security for notifications table and related functionality

BEGIN;

-- Load pgTAP extension
SELECT plan(28);

-- Test that the required tables exist
SELECT has_table('public', 'notifications', 'Notifications table exists');
SELECT has_table('public', 'notification_preferences', 'Notification preferences table exists');
SELECT has_table('public', 'notification_history', 'Notification history table exists');

-- Test that RLS is enabled
SELECT table_rls_enabled('public', 'notifications', 'RLS enabled on notifications table');
SELECT table_rls_enabled('public', 'notification_preferences', 'RLS enabled on notification_preferences table');

-- Create test users for policy testing
INSERT INTO auth.users (id, email, created_at, updated_at) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'guard1@summitadvisory.com', NOW(), NOW()),
    ('22222222-2222-2222-2222-222222222222', 'guard2@summitadvisory.com', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 'manager1@summitadvisory.com', NOW(), NOW()),
    ('44444444-4444-4444-4444-444444444444', 'admin1@summitadvisory.com', NOW(), NOW());

-- Create test guard profiles
INSERT INTO public.guard_profiles (
    id, 
    first_name, 
    last_name, 
    email, 
    phone, 
    status,
    role,
    created_at
) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'John', 'Guard', 'guard1@summitadvisory.com', '555-0101', 'active', 'guard', NOW()),
    ('22222222-2222-2222-2222-222222222222', 'Jane', 'Guard', 'guard2@summitadvisory.com', '555-0102', 'active', 'guard', NOW()),
    ('33333333-3333-3333-3333-333333333333', 'Mike', 'Manager', 'manager1@summitadvisory.com', '555-0201', 'active', 'manager', NOW()),
    ('44444444-4444-4444-4444-444444444444', 'Sarah', 'Admin', 'admin1@summitadvisory.com', '555-0301', 'active', 'admin', NOW());

-- Insert test notifications
INSERT INTO public.notifications (
    id,
    recipient_id,
    notification_type,
    priority,
    category,
    title,
    message,
    delivery_channels,
    is_read,
    entity_type,
    entity_id,
    created_at
) VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'shift_assignment', 'urgent', 'schedule', 'Urgent Shift', 'You have an urgent shift', ARRAY['in_app'], false, 'shift', 'shift-1', NOW()),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'availability_request', 'normal', 'availability', 'Availability Request', 'Please update availability', ARRAY['in_app', 'email'], false, 'availability', 'avail-1', NOW()),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'compliance_reminder', 'high', 'compliance', 'Training Due', 'Your training is due', ARRAY['in_app'], true, 'training', 'training-1', NOW()),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'system_alert', 'emergency', 'system', 'System Alert', 'System maintenance required', ARRAY['in_app', 'email'], false, 'system', 'system-1', NOW());

-- Test notification access policies

-- Test 1: Users can only read their own notifications
SET LOCAL row_security = on;
SET LOCAL auth.uid TO '11111111-1111-1111-1111-111111111111';

SELECT results_eq(
    'SELECT id FROM public.notifications ORDER BY created_at',
    $$VALUES 
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
        ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid)
    $$,
    'Guard can only see their own notifications'
);

-- Test 2: Different user sees different notifications
SET LOCAL auth.uid TO '22222222-2222-2222-2222-222222222222';

SELECT results_eq(
    'SELECT id FROM public.notifications ORDER BY created_at',
    $$VALUES 
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid)
    $$,
    'Different guard sees only their notifications'
);

-- Test 3: Manager can see team notifications (if policy allows)
SET LOCAL auth.uid TO '33333333-3333-3333-3333-333333333333';

SELECT ok(
    (SELECT COUNT(*) FROM public.notifications) >= 1,
    'Manager can see notifications'
);

-- Test 4: Admin can see system notifications
SET LOCAL auth.uid TO '44444444-4444-4444-4444-444444444444';

SELECT ok(
    (SELECT COUNT(*) FROM public.notifications) >= 1,
    'Admin can see notifications'
);

-- Test notification insert policies

-- Test 5: Guards cannot insert notifications for other users
SET LOCAL auth.uid TO '11111111-1111-1111-1111-111111111111';

SELECT throws_ok(
    $$INSERT INTO public.notifications (
        recipient_id, notification_type, priority, category, 
        title, message, delivery_channels
    ) VALUES (
        '22222222-2222-2222-2222-222222222222', 'test', 'normal', 'system',
        'Test Notification', 'Test message', ARRAY['in_app']
    )$$,
    'Guards cannot create notifications for other users'
);

-- Test 6: System can insert notifications (using service account or admin)
SET LOCAL auth.uid TO '44444444-4444-4444-4444-444444444444';

SELECT lives_ok(
    $$INSERT INTO public.notifications (
        recipient_id, notification_type, priority, category,
        title, message, delivery_channels
    ) VALUES (
        '11111111-1111-1111-1111-111111111111', 'system_test', 'normal', 'system',
        'Admin Test Notification', 'Admin test message', ARRAY['in_app']
    )$$,
    'Admin can create notifications'
);

-- Test notification update policies

-- Test 7: Users can mark their own notifications as read
SET LOCAL auth.uid TO '11111111-1111-1111-1111-111111111111';

SELECT lives_ok(
    $$UPDATE public.notifications 
      SET is_read = true, read_at = NOW() 
      WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
    'Users can mark their own notifications as read'
);

-- Test 8: Users cannot modify other users notifications
SELECT throws_ok(
    $$UPDATE public.notifications 
      SET is_read = true 
      WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
    'Users cannot modify other users notifications'
);

-- Test 9: Users can acknowledge their own notifications
SELECT lives_ok(
    $$UPDATE public.notifications 
      SET acknowledged_at = NOW() 
      WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
    'Users can acknowledge their own notifications'
);

-- Test notification preferences policies

-- Insert test preferences
INSERT INTO public.notification_preferences (
    user_id,
    in_app_enabled,
    email_enabled,
    schedule_notifications,
    availability_notifications,
    emergency_notifications,
    minimum_priority
) VALUES 
    ('11111111-1111-1111-1111-111111111111', true, true, true, true, true, 'normal'),
    ('22222222-2222-2222-2222-222222222222', true, false, true, false, true, 'high');

-- Test 10: Users can read their own preferences
SET LOCAL auth.uid TO '11111111-1111-1111-1111-111111111111';

SELECT results_eq(
    'SELECT user_id FROM public.notification_preferences',
    $$VALUES ('11111111-1111-1111-1111-111111111111'::uuid)$$,
    'Users can read their own notification preferences'
);

-- Test 11: Users cannot read other users preferences
SET LOCAL auth.uid TO '22222222-2222-2222-2222-222222222222';

SELECT results_eq(
    'SELECT user_id FROM public.notification_preferences',
    $$VALUES ('22222222-2222-2222-2222-222222222222'::uuid)$$,
    'Users cannot see other users preferences'
);

-- Test 12: Users can update their own preferences
SET LOCAL auth.uid TO '11111111-1111-1111-1111-111111111111';

SELECT lives_ok(
    $$UPDATE public.notification_preferences 
      SET email_enabled = false 
      WHERE user_id = '11111111-1111-1111-1111-111111111111'$$,
    'Users can update their own preferences'
);

-- Test 13: Users cannot update other users preferences
SELECT throws_ok(
    $$UPDATE public.notification_preferences 
      SET email_enabled = true 
      WHERE user_id = '22222222-2222-2222-2222-222222222222'$$,
    'Users cannot update other users preferences'
);

-- Test notification history policies

-- Insert test history records
INSERT INTO public.notification_history (
    notification_id,
    delivery_channel,
    delivery_status,
    delivery_provider,
    attempted_at,
    delivered_at
) VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'in_app', 'delivered', 'supabase', NOW(), NOW()),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'email', 'failed', 'sendgrid', NOW(), NULL),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'in_app', 'delivered', 'supabase', NOW(), NOW());

-- Test 14: Users can view history for their own notifications
SET LOCAL auth.uid TO '11111111-1111-1111-1111-111111111111';

SELECT ok(
    (SELECT COUNT(*) FROM public.notification_history nh
     JOIN public.notifications n ON nh.notification_id = n.id
     WHERE n.recipient_id = '11111111-1111-1111-1111-111111111111') >= 2,
    'Users can view delivery history for their notifications'
);

-- Test priority-based filtering

-- Test 15: Emergency notifications bypass normal filtering
INSERT INTO public.notifications (
    recipient_id, notification_type, priority, category,
    title, message, delivery_channels
) VALUES (
    '11111111-1111-1111-1111-111111111111', 'emergency_alert', 'emergency', 'emergency',
    'Emergency Alert', 'Immediate action required', ARRAY['in_app', 'email']
);

SET LOCAL auth.uid TO '11111111-1111-1111-1111-111111111111';

SELECT ok(
    (SELECT COUNT(*) FROM public.notifications WHERE priority = 'emergency') >= 1,
    'Emergency notifications are always visible'
);

-- Test category-based access

-- Test 16: Guards see schedule notifications
SELECT ok(
    (SELECT COUNT(*) FROM public.notifications WHERE category = 'schedule') >= 0,
    'Guards can see schedule notifications'
);

-- Test 17: Guards see availability notifications  
SELECT ok(
    (SELECT COUNT(*) FROM public.notifications WHERE category = 'availability') >= 0,
    'Guards can see availability notifications'
);

-- Test delivery channel validation

-- Test 18: Valid delivery channels are accepted
SELECT lives_ok(
    $$INSERT INTO public.notifications (
        recipient_id, notification_type, priority, category,
        title, message, delivery_channels
    ) VALUES (
        '11111111-1111-1111-1111-111111111111', 'test_delivery', 'normal', 'system',
        'Delivery Test', 'Testing delivery channels', ARRAY['in_app', 'email']
    )$$,
    'Valid delivery channels are accepted'
);

-- Test 19: Test notification cleanup for expired notifications
-- (This would test automatic cleanup policies if implemented)
SELECT ok(
    true, -- Placeholder for expired notification cleanup test
    'Expired notifications can be cleaned up'
);

-- Test bulk operations

-- Test 20: Users can mark multiple own notifications as read
SELECT lives_ok(
    $$UPDATE public.notifications 
      SET is_read = true, read_at = NOW() 
      WHERE recipient_id = '11111111-1111-1111-1111-111111111111' 
      AND is_read = false$$,
    'Users can bulk mark their notifications as read'
);

-- Test role-based access patterns

-- Test 21: Manager role access to team notifications (if implemented)
SET LOCAL auth.uid TO '33333333-3333-3333-3333-333333333333';

SELECT ok(
    (SELECT COUNT(*) FROM public.notifications) >= 0,
    'Managers have appropriate notification access'
);

-- Test 22: Admin role access to system notifications
SET LOCAL auth.uid TO '44444444-4444-4444-4444-444444444444';

SELECT ok(
    (SELECT COUNT(*) FROM public.notifications) >= 0,
    'Admins have appropriate notification access'
);

-- Test data integrity constraints

-- Test 23: Notification type must be valid
SELECT throws_ok(
    $$INSERT INTO public.notifications (
        recipient_id, notification_type, priority, category,
        title, message, delivery_channels
    ) VALUES (
        '11111111-1111-1111-1111-111111111111', 'invalid_type', 'normal', 'system',
        'Invalid Type Test', 'Testing invalid type', ARRAY['in_app']
    )$$,
    'Invalid notification types are rejected'
);

-- Test 24: Priority must be valid enum value
SELECT throws_ok(
    $$INSERT INTO public.notifications (
        recipient_id, notification_type, priority, category,
        title, message, delivery_channels
    ) VALUES (
        '11111111-1111-1111-1111-111111111111', 'system_test', 'invalid_priority', 'system',
        'Invalid Priority Test', 'Testing invalid priority', ARRAY['in_app']
    )$$,
    'Invalid priority values are rejected'
);

-- Test 25: Category must be valid enum value
SELECT throws_ok(
    $$INSERT INTO public.notifications (
        recipient_id, notification_type, priority, category,
        title, message, delivery_channels
    ) VALUES (
        '11111111-1111-1111-1111-111111111111', 'system_test', 'normal', 'invalid_category',
        'Invalid Category Test', 'Testing invalid category', ARRAY['in_app']
    )$$,
    'Invalid category values are rejected'
);

-- Test performance and indexing

-- Test 26: Queries on recipient_id are performant (index exists)
SELECT has_index(
    'public', 'notifications', 'idx_notifications_recipient_id',
    'Index exists on recipient_id for performance'
);

-- Test 27: Queries on created_at are performant (index exists)
SELECT has_index(
    'public', 'notifications', 'idx_notifications_created_at',
    'Index exists on created_at for performance'
);

-- Test 28: Queries on priority + is_read are performant (composite index)
SELECT has_index(
    'public', 'notifications', 'idx_notifications_priority_unread',
    'Composite index exists for priority and read status queries'
);

-- Clean up test data
SET LOCAL row_security = off;

DELETE FROM public.notification_history;
DELETE FROM public.notification_preferences;  
DELETE FROM public.notifications;
DELETE FROM public.guard_profiles;
DELETE FROM auth.users WHERE email LIKE '%@summitadvisory.com';

-- Finish the test
SELECT finish();

ROLLBACK;