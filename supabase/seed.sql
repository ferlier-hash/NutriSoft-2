-- Seed File: supabase/seed.sql
-- Description: Datos semilla ficticios reproducibles con UUIDs fijos (SEED-01 a SEED-09)

BEGIN;

-- 1. USUARIOS FICTICIOS EN auth.users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at)
VALUES
  ('a0000000-0000-4000-8000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@nutrisoft.test', '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP', NOW(), NULL, NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW(), NOW()),
  ('b1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@bienestar.test', '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP', NOW(), NULL, NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW(), NOW()),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'andrea@bienestar.test', '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP', NOW(), NULL, NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW(), NOW()),
  ('b3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sofia@bienestar.test', '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP', NOW(), NULL, NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW(), NOW()),
  ('b4444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'asistente@bienestar.test', '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP', NOW(), NULL, NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW(), NOW()),
  ('c1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@nutrivida.test', '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP', NOW(), NULL, NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW(), NOW()),
  ('p1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maria@paciente.test', '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP', NOW(), NULL, NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW(), NOW()),
  ('p2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pablo@paciente.test', '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP', NOW(), NULL, NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW(), NOW()),
  ('p3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lucia@paciente.test', '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP', NOW(), NULL, NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW(), NOW()),
  ('p4444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'paciente@nutrivida.test', '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP', NOW(), NULL, NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. PERFILES EN app.profiles
INSERT INTO app.profiles (id, email, full_name, phone)
VALUES
  ('a0000000-0000-4000-8000-000000000000', 'admin@nutrisoft.test', 'Administrador Plataforma', '+52 55 0000 0000'),
  ('b1111111-1111-4111-8111-111111111111', 'owner@bienestar.test', 'Dra. Elena Ramos', '+52 55 1111 1111'),
  ('b2222222-2222-4222-8222-222222222222', 'andrea@bienestar.test', 'Lic. Andrea N.', '+52 55 2222 2222'),
  ('b3333333-3333-4333-8333-333333333333', 'sofia@bienestar.test', 'Lic. Sofía M.', '+52 55 3333 3333'),
  ('b4444444-4444-4444-8444-444444444444', 'asistente@bienestar.test', 'Carlos Asistente', '+52 55 4444 4444'),
  ('c1111111-1111-4111-8111-111111111111', 'owner@nutrivida.test', 'Dr. Roberto NutriVida', '+52 55 5555 5555'),
  ('p1111111-1111-4111-8111-111111111111', 'maria@paciente.test', 'María González', '+52 55 6666 6666'),
  ('p2222222-2222-4222-8222-222222222222', 'pablo@paciente.test', 'Pablo Acosta', '+52 55 7777 7777'),
  ('p3333333-3333-4333-8333-333333333333', 'lucia@paciente.test', 'Lucía Torres', '+52 55 8888 8888'),
  ('p4444444-4444-4444-8444-444444444444', 'paciente@nutrivida.test', 'Esteban NutriVida', '+52 55 9999 9999')
ON CONFLICT (id) DO NOTHING;

-- 3. PLATFORM ROLES
INSERT INTO app.user_platform_roles (id, user_id, role)
VALUES
  ('r0000000-0000-4000-8000-000000000000', 'a0000000-0000-4000-8000-000000000000', 'platform_admin')
ON CONFLICT DO NOTHING;

-- 4. ORGANIZACIONES (SEED-05)
INSERT INTO app.organizations (id, name, slug, status)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Clínica Bienestar', 'clinica-bienestar', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'Centro NutriVida', 'centro-nutrivida', 'active'),
  ('33333333-3333-4333-8333-333333333333', 'Clínica Suspendida', 'clinica-suspendida', 'suspended')
ON CONFLICT (id) DO NOTHING;

-- 5. ORGANIZATION MEMBERS
INSERT INTO app.organization_members (id, organization_id, user_id, role, status)
VALUES
  ('m1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'b1111111-1111-4111-8111-111111111111', 'organization_owner', 'active'),
  ('m2222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', 'nutritionist', 'active'),
  ('m3333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'b3333333-3333-4333-8333-333333333333', 'nutritionist', 'active'),
  ('m4444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'b4444444-4444-4444-8444-444444444444', 'assistant', 'active'),
  ('mc111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'c1111111-1111-4111-8111-111111111111', 'organization_owner', 'active')
ON CONFLICT DO NOTHING;

-- 6. PACIENTES EN app.patients
INSERT INTO app.patients (id, organization_id, first_name, last_name, email, phone, city, nutrition_goal, current_plan_name, status, created_by)
VALUES
  ('pat11111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'María', 'González', 'maria@paciente.test', '+52 55 6666 6666', 'CDMX', 'Reeducación alimentaria', 'Plan Equilibrio 1800 kcal', 'active', 'b2222222-2222-4222-8222-222222222222'),
  ('pat22222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Pablo', 'Acosta', 'pablo@paciente.test', '+52 55 7777 7777', 'Guadalajara', 'Reducción de grasa corporal', 'Plan Deficit Pro 2100 kcal', 'active', 'b2222222-2222-4222-8222-222222222222'),
  ('pat33333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'Lucía', 'Torres', 'lucia@paciente.test', '+52 55 8888 8888', 'Monterrey', 'Rendimiento deportivo', 'Plan NutriSport 2500 kcal', 'active', 'b3333333-3333-4333-8333-333333333333'),
  ('pat44444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222', 'Esteban', 'NutriVida', 'paciente@nutrivida.test', '+52 55 9999 9999', 'Puebla', 'Salud cardiovascular', 'Plan Mediterráneo', 'active', 'c1111111-1111-4111-8111-111111111111')
ON CONFLICT DO NOTHING;

-- 7. ACCESO AL PORTAL DE PACIENTES
INSERT INTO app.patient_portal_access (id, organization_id, patient_id, user_id, status, granted_at)
VALUES
  ('acc11111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'pat11111-1111-4111-8111-111111111111', 'p1111111-1111-4111-8111-111111111111', 'active', NOW()),
  ('acc22222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'pat22222-2222-4222-8222-222222222222', 'p2222222-2222-4222-8222-222222222222', 'active', NOW()),
  ('acc33333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'pat33333-3333-4333-8333-333333333333', 'p3333333-3333-4333-8333-333333333333', 'active', NOW()),
  ('acc44444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222', 'pat44444-4444-4444-8444-444444444444', 'p4444444-4444-4444-8444-444444444444', 'active', NOW())
ON CONFLICT DO NOTHING;

-- 8. ASIGNACIONES PROFESIONALES (SEED-07: Andrea asignada a María y Pablo; Sofía asignada a Lucía)
INSERT INTO app.patient_assignments (id, organization_id, patient_id, nutritionist_user_id, is_primary, status)
VALUES
  ('pas11111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'pat11111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', true, 'active'),
  ('pas22222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'pat22222-2222-4222-8222-222222222222', 'b2222222-2222-4222-8222-222222222222', true, 'active'),
  ('pas33333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'pat33333-3333-4333-8333-333333333333', 'b3333333-3333-4333-8333-333333333333', true, 'active'),
  ('pas44444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222', 'pat44444-4444-4444-8444-444444444444', 'c1111111-1111-4111-8111-111111111111', true, 'active')
ON CONFLICT DO NOTHING;

-- 9. CHECK-IN ASSIGNMENTS (SEED-07: María tiene una pendiente; Pablo tiene una completada)
INSERT INTO app.check_in_assignments (id, organization_id, patient_id, created_by, status, due_date)
VALUES
  ('chk11111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'pat11111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', 'pending', NOW() + INTERVAL '5 days'),
  ('chk22222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'pat22222-2222-4222-8222-222222222222', 'b2222222-2222-4222-8222-222222222222', 'completed', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- 10. CHECK-IN RESPONSES (SEED-07: Pablo genera respuesta con alerta)
INSERT INTO app.check_in_responses (id, organization_id, assignment_id, patient_id, submitted_by, energy, adherence, help_requested, notes)
VALUES
  ('res22222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'chk22222-2222-4222-8222-222222222222', 'pat22222-2222-4222-8222-222222222222', 'p2222222-2222-4222-8222-222222222222', 1, 2, true, 'Tuve mucha fatiga esta semana y solicito ayuda.')
ON CONFLICT DO NOTHING;

-- 11. ALERTAS (SEED-07: Pablo genera alertas de alta prioridad)
INSERT INTO app.alerts (id, organization_id, patient_id, response_id, rule_code, priority, recommended_action, status)
VALUES
  ('alt22222-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'pat22222-2222-4222-8222-222222222222', 'res22222-2222-4222-8222-222222222222', 'HELP_REQUESTED', 'high', 'Contactar al paciente de manera prioritaria.', 'unresolved'),
  ('alt22222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'pat22222-2222-4222-8222-222222222222', 'res22222-2222-4222-8222-222222222222', 'LOW_ENERGY', 'high', 'Revisar el estado general y contactar al paciente.', 'unresolved')
ON CONFLICT DO NOTHING;

-- 12. RECOMENDACIONES
INSERT INTO app.patient_recommendations (id, organization_id, patient_id, response_id, created_by, recommendation_text, status)
VALUES
  ('rec11111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'pat11111-1111-4111-8111-111111111111', NULL, 'b2222222-2222-4222-8222-222222222222', 'Recuerda mantener 2 litros de agua al día e integrar infusión de manzanilla antes de dormir.', 'published')
ON CONFLICT DO NOTHING;

COMMIT;
