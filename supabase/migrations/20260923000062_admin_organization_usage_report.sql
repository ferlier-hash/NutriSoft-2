-- Numeric commercial and operational report per organization.
-- No patient, professional or file identities/content are returned.
CREATE OR REPLACE FUNCTION api.get_admin_organization_usage_report(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  organization_status text,
  plan_slug text,
  subscription_status text,
  active_patients bigint,
  max_active_patients integer,
  active_professionals bigint,
  professional_capacity integer,
  stored_pdf_bytes bigint,
  plan_storage_limit_bytes bigint,
  active_meal_plan_assignments bigint,
  branding_assets_count integer,
  branding_settings_fields_count integer,
  connected_google_calendars bigint,
  appointments_in_period bigint,
  completed_appointments_in_period bigint,
  checkin_responses_in_period bigint,
  published_meal_plan_versions_in_period bigint,
  income_by_currency jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT security.is_current_platform_admin() THEN
    RAISE EXCEPTION 'Acceso no autorizado: requiere rol platform_admin';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from >= p_to OR p_to - p_from > interval '367 days' THEN
    RAISE EXCEPTION 'Período inválido; elegí hasta 366 días.';
  END IF;

  RETURN QUERY
  WITH patient_usage AS (
    SELECT p.organization_id, count(*)::bigint AS active_patients
    FROM app.patients p
    JOIN app.patient_portal_access access
      ON access.organization_id = p.organization_id AND access.patient_id = p.id AND access.status = 'active'
    WHERE p.status = 'active'
    GROUP BY p.organization_id
  ), professional_usage AS (
    SELECT m.organization_id, count(*)::bigint AS active_professionals
    FROM app.organization_members m
    WHERE m.role IN ('organization_owner','nutritionist') AND m.status = 'active'
    GROUP BY m.organization_id
  ), pdf_usage AS (
    SELECT split_part(o.name, '/', 2)::uuid AS organization_id,
           sum(CASE WHEN o.metadata->>'size' ~ '^[0-9]+$' THEN (o.metadata->>'size')::bigint ELSE 0 END)::bigint AS stored_pdf_bytes
    FROM storage.objects o
    WHERE o.bucket_id = 'educational-documents'
      AND split_part(o.name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    GROUP BY split_part(o.name, '/', 2)::uuid
  ), active_plans AS (
    SELECT a.organization_id, count(*)::bigint AS active_meal_plan_assignments
    FROM app.meal_plan_assignments a WHERE a.status = 'active' GROUP BY a.organization_id
  ), branding_usage AS (
    SELECT b.organization_id,
      ((nullif(b.settings->>'logoPath','') IS NOT NULL)::integer
       + (nullif(b.settings->>'patientHeaderPath','') IS NOT NULL)::integer
       + (nullif(b.settings->>'professionalHeaderPath','') IS NOT NULL)::integer) AS branding_assets_count,
      ((nullif(b.settings->>'displayName','') IS NOT NULL)::integer
       + (nullif(b.settings->>'tagline','') IS NOT NULL)::integer
       + (nullif(b.settings->>'colorPreset','') IS NOT NULL)::integer
       + (nullif(b.settings->>'contactPhone','') IS NOT NULL)::integer
       + (nullif(b.settings->>'contactEmail','') IS NOT NULL)::integer
       + (nullif(b.settings->>'contactAddress','') IS NOT NULL)::integer) AS branding_settings_fields_count
    FROM app.organization_branding b
  ), calendar_usage AS (
    SELECT s.organization_id, count(*)::bigint AS connected_google_calendars
    FROM app.professional_practice_settings s
    JOIN app.organization_members m ON m.organization_id = s.organization_id AND m.user_id = s.nutritionist_user_id
    WHERE s.google_connection_status = 'connected' AND m.status = 'active' AND m.role IN ('organization_owner','nutritionist')
    GROUP BY s.organization_id
  ), appointment_usage AS (
    SELECT a.organization_id, count(*)::bigint AS appointments_in_period,
           count(*) FILTER (WHERE a.status = 'completed')::bigint AS completed_appointments_in_period
    FROM app.appointments a WHERE a.starts_at >= p_from AND a.starts_at < p_to
    GROUP BY a.organization_id
  ), checkin_usage AS (
    SELECT r.organization_id, count(*)::bigint AS checkin_responses_in_period
    FROM app.check_in_responses r WHERE r.created_at >= p_from AND r.created_at < p_to
    GROUP BY r.organization_id
  ), publication_usage AS (
    SELECT v.organization_id, count(*)::bigint AS published_meal_plan_versions_in_period
    FROM app.meal_plan_versions v WHERE v.published_at >= p_from AND v.published_at < p_to
    GROUP BY v.organization_id
  ), effective_income AS (
    SELECT root.organization_id, root.currency, coalesce(replacement.amount, root.amount) AS amount,
           'payment'::text AS kind, coalesce(replacement.occurred_at, root.occurred_at) AS occurred_at
    FROM app.appointment_payment_movements root
    LEFT JOIN LATERAL (
      SELECT correction.amount, correction.occurred_at
      FROM app.appointment_payment_movements correction
      WHERE correction.correction_of = root.id AND correction.correction_role = 'replacement'
      ORDER BY correction.correction_revision DESC LIMIT 1
    ) replacement ON true
    WHERE root.correction_of IS NULL AND root.movement_kind = 'payment'
    UNION ALL
    SELECT refund.organization_id, refund.currency, refund.amount, 'refund'::text, refund.occurred_at
    FROM app.appointment_payment_movements refund
    WHERE refund.correction_of IS NULL AND refund.movement_kind = 'refund' AND refund.refunded_payment_id IS NOT NULL
  ), income_summary AS (
    SELECT by_currency.organization_id,
      jsonb_agg(jsonb_build_object(
        'currency', by_currency.currency,
        'payments', by_currency.payments,
        'refunds', by_currency.refunds,
        'net', by_currency.payments - by_currency.refunds,
        'payment_count', by_currency.payment_count,
        'refund_count', by_currency.refund_count
      ) ORDER BY by_currency.currency) AS income_by_currency
    FROM (
      SELECT ei.organization_id, ei.currency,
        coalesce(sum(amount) FILTER (WHERE kind = 'payment'), 0)::numeric(14,2) AS payments,
        coalesce(sum(amount) FILTER (WHERE kind = 'refund'), 0)::numeric(14,2) AS refunds,
        count(*) FILTER (WHERE kind = 'payment')::integer AS payment_count,
        count(*) FILTER (WHERE kind = 'refund')::integer AS refund_count
      FROM effective_income ei
      WHERE ei.occurred_at >= p_from AND ei.occurred_at < p_to
      GROUP BY ei.organization_id, ei.currency
    ) by_currency
    GROUP BY by_currency.organization_id
  )
  SELECT org.id, org.name, org.slug, org.status,
         sub.plan_slug, sub.status,
         coalesce(pat.active_patients, 0), plan.max_active_patients,
         coalesce(pro.active_professionals, 0),
         CASE WHEN plan.slug = 'pro' THEN plan.included_professionals + sub.extra_professionals
              ELSE plan.included_professionals END,
         coalesce(pdf.stored_pdf_bytes, 0), plan.storage_limit_bytes,
         coalesce(ap.active_meal_plan_assignments, 0), coalesce(brand.branding_assets_count, 0),
         coalesce(brand.branding_settings_fields_count, 0), coalesce(calendars.connected_google_calendars, 0),
         coalesce(appt.appointments_in_period, 0), coalesce(appt.completed_appointments_in_period, 0),
         coalesce(checkins.checkin_responses_in_period, 0), coalesce(publications.published_meal_plan_versions_in_period, 0),
         coalesce(income.income_by_currency, '[]'::jsonb)
  FROM app.organizations org
  LEFT JOIN patient_usage pat ON pat.organization_id = org.id
  LEFT JOIN professional_usage pro ON pro.organization_id = org.id
  LEFT JOIN pdf_usage pdf ON pdf.organization_id = org.id
  LEFT JOIN active_plans ap ON ap.organization_id = org.id
  LEFT JOIN branding_usage brand ON brand.organization_id = org.id
  LEFT JOIN calendar_usage calendars ON calendars.organization_id = org.id
  LEFT JOIN appointment_usage appt ON appt.organization_id = org.id
  LEFT JOIN checkin_usage checkins ON checkins.organization_id = org.id
  LEFT JOIN publication_usage publications ON publications.organization_id = org.id
  LEFT JOIN income_summary income ON income.organization_id = org.id
  LEFT JOIN app.organization_subscriptions sub ON sub.organization_id = org.id
  LEFT JOIN app.plan_catalog plan ON plan.slug = sub.plan_slug
  ORDER BY org.name, org.id;
END;
$$;

REVOKE ALL ON FUNCTION api.get_admin_organization_usage_report(timestamptz,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION api.get_admin_organization_usage_report(timestamptz,timestamptz) TO authenticated;

NOTIFY pgrst, 'reload schema';
