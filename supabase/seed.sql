-- ============================================================
-- Modern Tennis Seed Data
-- ============================================================

DO $$
DECLARE
  v_org_id UUID := '00000000-0000-0000-0000-000000000001';
  -- Auth user IDs (= auth.users.id, also used for users.auth_id)
  v_owner_auth UUID := 'b0000000-0000-0000-0000-000000000001';
  v_admin_auth UUID := 'b0000000-0000-0000-0000-000000000002';
  coach_sarah_auth UUID := 'b0000000-0000-0000-0000-000000000003';
  coach_mike_auth UUID := 'b0000000-0000-0000-0000-000000000004';
  coach_lisa_auth UUID := 'b0000000-0000-0000-0000-000000000005';
  parent_johnson_auth UUID := 'b0000000-0000-0000-0000-000000000006';
  parent_williams_auth UUID := 'b0000000-0000-0000-0000-000000000007';
  parent_garcia_auth UUID := 'b0000000-0000-0000-0000-000000000008';
  parent_chen_auth UUID := 'b0000000-0000-0000-0000-000000000009';
  parent_patel_auth UUID := 'b0000000-0000-0000-0000-000000000010';
  -- App user IDs (users.id primary key)
  v_owner_uid UUID := 'c0000000-0000-0000-0000-000000000001';
  v_admin_uid UUID := 'c0000000-0000-0000-0000-000000000002';
  coach_sarah_uid UUID := 'c0000000-0000-0000-0000-000000000003';
  coach_mike_uid UUID := 'c0000000-0000-0000-0000-000000000004';
  coach_lisa_uid UUID := 'c0000000-0000-0000-0000-000000000005';
  parent_johnson_uid UUID := 'c0000000-0000-0000-0000-000000000006';
  parent_williams_uid UUID := 'c0000000-0000-0000-0000-000000000007';
  parent_garcia_uid UUID := 'c0000000-0000-0000-0000-000000000008';
  parent_chen_uid UUID := 'c0000000-0000-0000-0000-000000000009';
  parent_patel_uid UUID := 'c0000000-0000-0000-0000-000000000010';
  -- Student IDs
  student_1 UUID := 'd0000000-0000-0000-0000-000000000001';
  student_2 UUID := 'd0000000-0000-0000-0000-000000000002';
  student_3 UUID := 'd0000000-0000-0000-0000-000000000003';
  student_4 UUID := 'd0000000-0000-0000-0000-000000000004';
  student_5 UUID := 'd0000000-0000-0000-0000-000000000005';
  student_6 UUID := 'd0000000-0000-0000-0000-000000000006';
  student_7 UUID := 'd0000000-0000-0000-0000-000000000007';
  student_8 UUID := 'd0000000-0000-0000-0000-000000000008';
  student_9 UUID := 'd0000000-0000-0000-0000-000000000009';
  student_10 UUID := 'd0000000-0000-0000-0000-000000000010';
  -- Court IDs
  court_1 UUID := 'e0000000-0000-0000-0000-000000000001';
  court_2 UUID := 'e0000000-0000-0000-0000-000000000002';
  court_3 UUID := 'e0000000-0000-0000-0000-000000000003';
  court_4 UUID := 'e0000000-0000-0000-0000-000000000004';
  -- Lesson template IDs
  lt_1 UUID := 'f0000000-0000-0000-0000-000000000001';
  lt_2 UUID := 'f0000000-0000-0000-0000-000000000002';
  lt_3 UUID := 'f0000000-0000-0000-0000-000000000003';
  lt_4 UUID := 'f0000000-0000-0000-0000-000000000004';
  lt_5 UUID := 'f0000000-0000-0000-0000-000000000005';
  lt_6 UUID := 'f0000000-0000-0000-0000-000000000006';
  lt_7 UUID := 'f0000000-0000-0000-0000-000000000007';
  lt_8 UUID := 'f0000000-0000-0000-0000-000000000008';
  -- Subscription IDs
  sub_1 UUID := 'a1000000-0000-0000-0000-000000000001';
  sub_2 UUID := 'a1000000-0000-0000-0000-000000000002';
  sub_3 UUID := 'a1000000-0000-0000-0000-000000000003';
  sub_4 UUID := 'a1000000-0000-0000-0000-000000000004';
  -- Password hash for 'password123'
  pw_hash TEXT := crypt('password123', gen_salt('bf'));
  -- Date references
  today DATE := CURRENT_DATE;
  last_monday DATE;
  this_monday DATE;
  -- Lesson instance IDs for note references
  v_li_id UUID;
BEGIN

  last_monday := today - ((EXTRACT(DOW FROM today)::INT + 6) % 7) - 7;
  this_monday := today - ((EXTRACT(DOW FROM today)::INT + 6) % 7);

  -- ============================================================
  -- Organization
  -- ============================================================
  INSERT INTO organizations (id, name, slug, email, phone, address, timezone)
  VALUES (v_org_id, 'Modern Tennis', 'modern-tennis', 'info@moderntennis.com', '555-0100', '123 Tennis Lane, Sportsville, CA 90210', 'America/Los_Angeles');

  -- ============================================================
  -- Auth Users (10 users, password: password123)
  -- ============================================================
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, phone_change, phone_change_token, reauthentication_token, is_sso_user, is_anonymous)
  VALUES
    (v_owner_auth, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@moderntennis.com', pw_hash, NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '', '', '', '', '', FALSE, FALSE),
    (v_admin_auth, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@moderntennis.com', pw_hash, NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '', '', '', '', '', FALSE, FALSE),
    (coach_sarah_auth, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'coach.sarah@moderntennis.com', pw_hash, NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '', '', '', '', '', FALSE, FALSE),
    (coach_mike_auth, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'coach.mike@moderntennis.com', pw_hash, NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '', '', '', '', '', FALSE, FALSE),
    (coach_lisa_auth, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'coach.lisa@moderntennis.com', pw_hash, NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '', '', '', '', '', FALSE, FALSE),
    (parent_johnson_auth, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'parent.johnson@email.com', pw_hash, NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '', '', '', '', '', FALSE, FALSE),
    (parent_williams_auth, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'parent.williams@email.com', pw_hash, NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '', '', '', '', '', FALSE, FALSE),
    (parent_garcia_auth, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'parent.garcia@email.com', pw_hash, NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '', '', '', '', '', FALSE, FALSE),
    (parent_chen_auth, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'parent.chen@email.com', pw_hash, NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '', '', '', '', '', FALSE, FALSE),
    (parent_patel_auth, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'parent.patel@email.com', pw_hash, NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '', '', '', '', '', FALSE, FALSE);

  -- Auth identities
  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_owner_auth::text, v_owner_auth, jsonb_build_object('sub', v_owner_auth, 'email', 'owner@moderntennis.com'), 'email', NOW(), NOW(), NOW()),
    (gen_random_uuid(), v_admin_auth::text, v_admin_auth, jsonb_build_object('sub', v_admin_auth, 'email', 'admin@moderntennis.com'), 'email', NOW(), NOW(), NOW()),
    (gen_random_uuid(), coach_sarah_auth::text, coach_sarah_auth, jsonb_build_object('sub', coach_sarah_auth, 'email', 'coach.sarah@moderntennis.com'), 'email', NOW(), NOW(), NOW()),
    (gen_random_uuid(), coach_mike_auth::text, coach_mike_auth, jsonb_build_object('sub', coach_mike_auth, 'email', 'coach.mike@moderntennis.com'), 'email', NOW(), NOW(), NOW()),
    (gen_random_uuid(), coach_lisa_auth::text, coach_lisa_auth, jsonb_build_object('sub', coach_lisa_auth, 'email', 'coach.lisa@moderntennis.com'), 'email', NOW(), NOW(), NOW()),
    (gen_random_uuid(), parent_johnson_auth::text, parent_johnson_auth, jsonb_build_object('sub', parent_johnson_auth, 'email', 'parent.johnson@email.com'), 'email', NOW(), NOW(), NOW()),
    (gen_random_uuid(), parent_williams_auth::text, parent_williams_auth, jsonb_build_object('sub', parent_williams_auth, 'email', 'parent.williams@email.com'), 'email', NOW(), NOW(), NOW()),
    (gen_random_uuid(), parent_garcia_auth::text, parent_garcia_auth, jsonb_build_object('sub', parent_garcia_auth, 'email', 'parent.garcia@email.com'), 'email', NOW(), NOW(), NOW()),
    (gen_random_uuid(), parent_chen_auth::text, parent_chen_auth, jsonb_build_object('sub', parent_chen_auth, 'email', 'parent.chen@email.com'), 'email', NOW(), NOW(), NOW()),
    (gen_random_uuid(), parent_patel_auth::text, parent_patel_auth, jsonb_build_object('sub', parent_patel_auth, 'email', 'parent.patel@email.com'), 'email', NOW(), NOW(), NOW());

  -- ============================================================
  -- App Users (users.id is separate from auth.users.id; auth_id links them)
  -- ============================================================
  INSERT INTO users (id, auth_id, org_id, role, first_name, last_name, email, phone)
  VALUES
    (v_owner_uid, v_owner_auth, v_org_id, 'owner', 'James', 'Owner', 'owner@moderntennis.com', '555-0101'),
    (v_admin_uid, v_admin_auth, v_org_id, 'admin', 'Emily', 'Admin', 'admin@moderntennis.com', '555-0102'),
    (coach_sarah_uid, coach_sarah_auth, v_org_id, 'coach', 'Sarah', 'Thompson', 'coach.sarah@moderntennis.com', '555-0103'),
    (coach_mike_uid, coach_mike_auth, v_org_id, 'coach', 'Mike', 'Rodriguez', 'coach.mike@moderntennis.com', '555-0104'),
    (coach_lisa_uid, coach_lisa_auth, v_org_id, 'coach', 'Lisa', 'Park', 'coach.lisa@moderntennis.com', '555-0105'),
    (parent_johnson_uid, parent_johnson_auth, v_org_id, 'parent', 'David', 'Johnson', 'parent.johnson@email.com', '555-0201'),
    (parent_williams_uid, parent_williams_auth, v_org_id, 'parent', 'Maria', 'Williams', 'parent.williams@email.com', '555-0202'),
    (parent_garcia_uid, parent_garcia_auth, v_org_id, 'parent', 'Carlos', 'Garcia', 'parent.garcia@email.com', '555-0203'),
    (parent_chen_uid, parent_chen_auth, v_org_id, 'parent', 'Wei', 'Chen', 'parent.chen@email.com', '555-0204'),
    (parent_patel_uid, parent_patel_auth, v_org_id, 'parent', 'Priya', 'Patel', 'parent.patel@email.com', '555-0205');

  -- Set org owner (owner_id references users.id)
  UPDATE organizations SET owner_id = v_owner_uid WHERE id = v_org_id;

  -- ============================================================
  -- Students (2 per parent, parent_id references users.id)
  -- ============================================================
  INSERT INTO students (id, org_id, parent_id, first_name, last_name, date_of_birth, skill_level)
  VALUES
    (student_1, v_org_id, parent_johnson_uid, 'Emma', 'Johnson', '2015-03-15', 'intermediate'),
    (student_2, v_org_id, parent_johnson_uid, 'Liam', 'Johnson', '2017-07-22', 'beginner'),
    (student_3, v_org_id, parent_williams_uid, 'Sophia', 'Williams', '2014-11-08', 'advanced'),
    (student_4, v_org_id, parent_williams_uid, 'Noah', 'Williams', '2016-05-30', 'intermediate'),
    (student_5, v_org_id, parent_garcia_uid, 'Isabella', 'Garcia', '2015-09-12', 'intermediate'),
    (student_6, v_org_id, parent_garcia_uid, 'Lucas', 'Garcia', '2018-01-25', 'beginner'),
    (student_7, v_org_id, parent_chen_uid, 'Mia', 'Chen', '2013-06-18', 'elite'),
    (student_8, v_org_id, parent_chen_uid, 'Oliver', 'Chen', '2016-12-03', 'intermediate'),
    (student_9, v_org_id, parent_patel_uid, 'Ava', 'Patel', '2014-04-07', 'advanced'),
    (student_10, v_org_id, parent_patel_uid, 'Ethan', 'Patel', '2017-08-14', 'beginner');

  -- ============================================================
  -- Courts
  -- ============================================================
  INSERT INTO courts (id, org_id, name, surface_type, is_indoor, status)
  VALUES
    (court_1, v_org_id, 'Court 1', 'Hard', FALSE, 'active'),
    (court_2, v_org_id, 'Court 2', 'Clay', FALSE, 'active'),
    (court_3, v_org_id, 'Court 3', 'Hard', TRUE, 'active'),
    (court_4, v_org_id, 'Court 4', 'Clay', TRUE, 'maintenance');

  -- ============================================================
  -- Lesson Templates (8 templates)
  -- ============================================================
  INSERT INTO lesson_templates (id, org_id, coach_id, court_id, name, lesson_type, max_students, duration_minutes, price_cents, day_of_week, start_time)
  VALUES
    (lt_1, v_org_id, coach_sarah_uid, court_1, 'Beginner Group Mon', 'group', 6, 60, 3500, 1, '09:00'),
    (lt_2, v_org_id, coach_sarah_uid, court_1, 'Intermediate Group Wed', 'group', 6, 60, 4000, 3, '09:00'),
    (lt_3, v_org_id, coach_mike_uid, court_2, 'Advanced Group Tue', 'group', 4, 90, 5500, 2, '10:00'),
    (lt_4, v_org_id, coach_mike_uid, court_2, 'Competitive Private Thu', 'private', 1, 60, 8000, 4, '14:00'),
    (lt_5, v_org_id, coach_lisa_uid, court_3, 'Beginner Group Tue', 'group', 6, 60, 3500, 2, '16:00'),
    (lt_6, v_org_id, coach_lisa_uid, court_3, 'Semi-Private Fri', 'semi_private', 2, 60, 6000, 5, '10:00'),
    (lt_7, v_org_id, coach_sarah_uid, court_1, 'Intermediate Group Fri', 'group', 6, 60, 4000, 5, '09:00'),
    (lt_8, v_org_id, coach_mike_uid, court_2, 'Advanced Group Sat', 'group', 4, 90, 5500, 6, '08:00');

  -- ============================================================
  -- Lesson Instances (2 weeks: past + current/next)
  -- ============================================================
  -- PAST WEEK (completed)
  INSERT INTO lesson_instances (org_id, template_id, coach_id, court_id, date, start_time, end_time, status)
  VALUES
    (v_org_id, lt_1, coach_sarah_uid, court_1, last_monday, '09:00', '10:00', 'completed'),
    (v_org_id, lt_3, coach_mike_uid, court_2, last_monday + 1, '10:00', '11:30', 'completed'),
    (v_org_id, lt_5, coach_lisa_uid, court_3, last_monday + 1, '16:00', '17:00', 'completed'),
    (v_org_id, lt_2, coach_sarah_uid, court_1, last_monday + 2, '09:00', '10:00', 'completed'),
    (v_org_id, lt_4, coach_mike_uid, court_2, last_monday + 3, '14:00', '15:00', 'completed'),
    (v_org_id, lt_7, coach_sarah_uid, court_1, last_monday + 4, '09:00', '10:00', 'completed'),
    (v_org_id, lt_6, coach_lisa_uid, court_3, last_monday + 4, '10:00', '11:00', 'completed'),
    (v_org_id, lt_8, coach_mike_uid, court_2, last_monday + 5, '08:00', '09:30', 'completed');

  -- CURRENT/NEXT WEEK (scheduled)
  INSERT INTO lesson_instances (org_id, template_id, coach_id, court_id, date, start_time, end_time, status)
  VALUES
    (v_org_id, lt_1, coach_sarah_uid, court_1, this_monday, '09:00', '10:00', 'scheduled'),
    (v_org_id, lt_3, coach_mike_uid, court_2, this_monday + 1, '10:00', '11:30', 'scheduled'),
    (v_org_id, lt_5, coach_lisa_uid, court_3, this_monday + 1, '16:00', '17:00', 'scheduled'),
    (v_org_id, lt_2, coach_sarah_uid, court_1, this_monday + 2, '09:00', '10:00', 'scheduled'),
    (v_org_id, lt_4, coach_mike_uid, court_2, this_monday + 3, '14:00', '15:00', 'scheduled'),
    (v_org_id, lt_7, coach_sarah_uid, court_1, this_monday + 4, '09:00', '10:00', 'scheduled'),
    (v_org_id, lt_6, coach_lisa_uid, court_3, this_monday + 4, '10:00', '11:00', 'scheduled'),
    (v_org_id, lt_8, coach_mike_uid, court_2, this_monday + 5, '08:00', '09:30', 'scheduled');

  -- ============================================================
  -- Enrollments for past week (with attendance)
  -- ============================================================
  INSERT INTO enrollments (org_id, lesson_instance_id, student_id, status, attended)
  SELECT li.org_id, li.id, s.student_id::uuid, 'completed'::enrollment_status, s.attended
  FROM lesson_instances li
  CROSS JOIN (VALUES
    (student_1, TRUE), (student_2, TRUE), (student_5, FALSE), (student_6, TRUE)
  ) AS s(student_id, attended)
  WHERE li.template_id = lt_1 AND li.status = 'completed';

  INSERT INTO enrollments (org_id, lesson_instance_id, student_id, status, attended)
  SELECT li.org_id, li.id, s.student_id::uuid, 'completed'::enrollment_status, s.attended
  FROM lesson_instances li
  CROSS JOIN (VALUES
    (student_3, TRUE), (student_4, TRUE), (student_9, TRUE)
  ) AS s(student_id, attended)
  WHERE li.template_id = lt_3 AND li.status = 'completed';

  INSERT INTO enrollments (org_id, lesson_instance_id, student_id, status, attended)
  SELECT li.org_id, li.id, s.student_id::uuid, 'completed'::enrollment_status, s.attended
  FROM lesson_instances li
  CROSS JOIN (VALUES
    (student_7, TRUE)
  ) AS s(student_id, attended)
  WHERE li.template_id = lt_4 AND li.status = 'completed';

  -- Enrollments for current week (scheduled)
  INSERT INTO enrollments (org_id, lesson_instance_id, student_id, status)
  SELECT li.org_id, li.id, s.student_id::uuid, 'enrolled'::enrollment_status
  FROM lesson_instances li
  CROSS JOIN (VALUES
    (student_1), (student_2), (student_5), (student_6), (student_10)
  ) AS s(student_id)
  WHERE li.template_id = lt_1 AND li.status = 'scheduled';

  INSERT INTO enrollments (org_id, lesson_instance_id, student_id, status)
  SELECT li.org_id, li.id, s.student_id::uuid, 'enrolled'::enrollment_status
  FROM lesson_instances li
  CROSS JOIN (VALUES
    (student_3), (student_4), (student_9)
  ) AS s(student_id)
  WHERE li.template_id = lt_3 AND li.status = 'scheduled';

  INSERT INTO enrollments (org_id, lesson_instance_id, student_id, status)
  SELECT li.org_id, li.id, s.student_id::uuid, 'enrolled'::enrollment_status
  FROM lesson_instances li
  CROSS JOIN (VALUES
    (student_7)
  ) AS s(student_id)
  WHERE li.template_id = lt_4 AND li.status = 'scheduled';

  -- ============================================================
  -- Student Notes (10 notes from coaches, mix of private/public)
  -- ============================================================
  -- Get a completed lesson instance id for linking some notes
  SELECT id INTO v_li_id FROM lesson_instances
    WHERE template_id = lt_1 AND status = 'completed' LIMIT 1;

  INSERT INTO student_notes (org_id, student_id, author_id, content, is_private, lesson_instance_id, created_at)
  VALUES
    (v_org_id, student_1, coach_sarah_uid, 'Emma is making great progress with her forehand. Consistent topspin now.', FALSE, v_li_id, NOW() - INTERVAL '6 days'),
    (v_org_id, student_1, coach_sarah_uid, 'Need to work on backhand slice - tends to float.', TRUE, v_li_id, NOW() - INTERVAL '5 days'),
    (v_org_id, student_2, coach_sarah_uid, 'Liam had a tough session today, struggled with footwork drills.', TRUE, NULL, NOW() - INTERVAL '4 days'),
    (v_org_id, student_3, coach_mike_uid, 'Sophia is ready to start competing in junior tournaments.', FALSE, NULL, NOW() - INTERVAL '3 days'),
    (v_org_id, student_3, coach_mike_uid, 'Serve speed has improved by 15% this month. Excellent work.', FALSE, NULL, NOW() - INTERVAL '2 days'),
    (v_org_id, student_5, coach_sarah_uid, 'Isabella showed great sportsmanship during the group drill today.', FALSE, v_li_id, NOW() - INTERVAL '2 days'),
    (v_org_id, student_7, coach_mike_uid, 'Mia is our top student. Consider recommending for the elite summer camp.', TRUE, NULL, NOW() - INTERVAL '1 day'),
    (v_org_id, student_7, coach_mike_uid, 'Excellent match play today - won all practice sets.', FALSE, NULL, NOW() - INTERVAL '12 hours'),
    (v_org_id, student_9, coach_lisa_uid, 'Ava needs to focus on second serve consistency.', FALSE, NULL, NOW() - INTERVAL '8 hours'),
    (v_org_id, student_4, coach_mike_uid, 'Noah is improving steadily. Good attitude and work ethic.', FALSE, NULL, NOW() - INTERVAL '4 hours');

  -- ============================================================
  -- Notifications (mix of read/unread for parents and coaches)
  -- ============================================================
  INSERT INTO notifications (org_id, user_id, title, body, channel, status, read_at, created_at)
  VALUES
    -- Parent Johnson notifications
    (v_org_id, parent_johnson_uid, 'Lesson Reminder', 'Emma has a Beginner Group lesson tomorrow at 9:00 AM on Court 1.', 'push', 'sent', NULL, NOW() - INTERVAL '2 hours'),
    (v_org_id, parent_johnson_uid, 'Attendance Update', 'Liam attended the Monday group lesson. Great participation!', 'push', 'sent', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    (v_org_id, parent_johnson_uid, 'Payment Received', 'Your monthly subscription payment of $120.00 has been processed.', 'email', 'sent', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
    (v_org_id, parent_johnson_uid, 'New Note Added', 'Coach Sarah added a note about Emma''s progress.', 'push', 'sent', NULL, NOW() - INTERVAL '6 days'),
    (v_org_id, parent_johnson_uid, 'Schedule Change', 'The Wednesday Intermediate Group has been moved to 10:00 AM.', 'email', 'sent', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    -- Parent Williams notifications
    (v_org_id, parent_williams_uid, 'Lesson Reminder', 'Sophia has an Advanced Group lesson tomorrow at 10:00 AM.', 'push', 'sent', NULL, NOW() - INTERVAL '1 hour'),
    (v_org_id, parent_williams_uid, 'Tournament Recommendation', 'Coach Mike recommends Sophia for the Junior Spring Tournament.', 'push', 'sent', NULL, NOW() - INTERVAL '3 days'),
    (v_org_id, parent_williams_uid, 'Payment Due', 'Your subscription payment of $180.00 is due in 3 days.', 'email', 'sent', NULL, NOW() - INTERVAL '1 day'),
    -- Parent Garcia notifications
    (v_org_id, parent_garcia_uid, 'Welcome!', 'Welcome to Modern Tennis! Your children are enrolled.', 'email', 'sent', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
    (v_org_id, parent_garcia_uid, 'Lesson Reminder', 'Isabella has a group lesson this week.', 'push', 'sent', NULL, NOW() - INTERVAL '3 hours'),
    -- Parent Chen notifications
    (v_org_id, parent_chen_uid, 'Elite Camp Invitation', 'Mia has been recommended for the summer elite camp!', 'push', 'sent', NULL, NOW() - INTERVAL '1 day'),
    (v_org_id, parent_chen_uid, 'Payment Received', 'Your payment of $80.00 for private lessons has been received.', 'email', 'sent', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
    -- Parent Patel notifications
    (v_org_id, parent_patel_uid, 'Welcome!', 'Welcome to Modern Tennis!', 'email', 'sent', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
    (v_org_id, parent_patel_uid, 'Progress Update', 'Coach Lisa has added notes about Ava''s progress.', 'push', 'sent', NULL, NOW() - INTERVAL '8 hours'),
    -- Coach notifications
    (v_org_id, coach_sarah_uid, 'New Student Enrolled', 'Ethan Patel has been enrolled in your Monday Beginner Group.', 'push', 'sent', NULL, NOW() - INTERVAL '2 days'),
    (v_org_id, coach_sarah_uid, 'Schedule Update', 'A new lesson instance has been generated for next week.', 'push', 'sent', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
    (v_org_id, coach_mike_uid, 'Court Maintenance', 'Court 4 is under maintenance. Your Thursday lesson moved to Court 2.', 'push', 'sent', NULL, NOW() - INTERVAL '5 days'),
    (v_org_id, coach_mike_uid, 'New Student Enrolled', 'Ava Patel has been enrolled in your Tuesday Advanced Group.', 'push', 'sent', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
    (v_org_id, coach_lisa_uid, 'Schedule Reminder', 'You have 3 lessons scheduled this week.', 'push', 'sent', NULL, NOW() - INTERVAL '1 day'),
    (v_org_id, coach_lisa_uid, 'Availability Conflict', 'There is a scheduling conflict on Friday morning. Please update your availability.', 'push', 'sent', NULL, NOW() - INTERVAL '6 hours');

  -- ============================================================
  -- Subscriptions (4 active subscriptions for parents)
  -- ============================================================
  INSERT INTO subscriptions (id, org_id, user_id, name, description, price_cents, lessons_per_month, starts_at, ends_at, status, created_at)
  VALUES
    (sub_1, v_org_id, parent_johnson_uid, 'Monthly Group Plan', 'Unlimited group lessons for both children', 12000, 8, (today - INTERVAL '30 days')::timestamptz, NULL, 'active', NOW() - INTERVAL '30 days'),
    (sub_2, v_org_id, parent_williams_uid, 'Advanced Training Package', 'Advanced group + 2 semi-private sessions per month', 18000, 6, (today - INTERVAL '60 days')::timestamptz, (today + INTERVAL '300 days')::timestamptz, 'active', NOW() - INTERVAL '60 days'),
    (sub_3, v_org_id, parent_chen_uid, 'Private Lesson Package', '4 private lessons per month for Mia', 32000, 4, (today - INTERVAL '45 days')::timestamptz, NULL, 'active', NOW() - INTERVAL '45 days'),
    (sub_4, v_org_id, parent_garcia_uid, 'Basic Group Plan', 'Group lessons for Isabella and Lucas', 9500, 4, (today - INTERVAL '90 days')::timestamptz, (today - INTERVAL '1 day')::timestamptz, 'expired', NOW() - INTERVAL '90 days');

  -- ============================================================
  -- Payments (10 payments linked to subscriptions and lessons)
  -- ============================================================
  INSERT INTO payments (org_id, user_id, amount_cents, payment_type, payment_status, payment_platform, subscription_id, description, paid_at, created_at)
  VALUES
    -- Johnson payments
    (v_org_id, parent_johnson_uid, 12000, 'subscription', 'completed', 'stripe', sub_1, 'Monthly Group Plan - January', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
    (v_org_id, parent_johnson_uid, 12000, 'subscription', 'completed', 'stripe', sub_1, 'Monthly Group Plan - February', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    -- Williams payments
    (v_org_id, parent_williams_uid, 18000, 'subscription', 'completed', 'stripe', sub_2, 'Advanced Training - Month 1', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
    (v_org_id, parent_williams_uid, 18000, 'subscription', 'completed', 'stripe', sub_2, 'Advanced Training - Month 2', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
    (v_org_id, parent_williams_uid, 18000, 'subscription', 'pending', 'stripe', sub_2, 'Advanced Training - Month 3', NULL, NOW() - INTERVAL '1 day'),
    -- Chen payments
    (v_org_id, parent_chen_uid, 32000, 'subscription', 'completed', 'square', sub_3, 'Private Lesson Package - Month 1', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
    (v_org_id, parent_chen_uid, 8000, 'lesson', 'completed', 'cash', NULL, 'Extra private lesson - Mia', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
    -- Garcia payments
    (v_org_id, parent_garcia_uid, 9500, 'subscription', 'completed', 'check', sub_4, 'Basic Group Plan - Final month', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
    -- Patel payments
    (v_org_id, parent_patel_uid, 5500, 'drop_in', 'completed', 'cash', NULL, 'Drop-in lesson - Ava', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
    (v_org_id, parent_patel_uid, 3500, 'lesson', 'refunded', 'stripe', NULL, 'Cancelled lesson refund - Ethan', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days');

END $$;
