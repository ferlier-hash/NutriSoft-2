-- A consultorio may exist before its subscription is assigned. Monthly
-- snapshots must record that organization as inactive, never as NULL.
CREATE OR REPLACE FUNCTION app.capture_admin_organization_monthly_snapshot(p_snapshot_month date DEFAULT date_trunc('month',timezone('UTC',clock_timestamp()))::date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $$
DECLARE
  v_activity_from timestamptz := (p_snapshot_month::timestamp - interval '1 month') AT TIME ZONE 'UTC';
  v_activity_to timestamptz := p_snapshot_month::timestamp AT TIME ZONE 'UTC';
  v_inserted integer;
BEGIN
  IF p_snapshot_month IS NULL OR extract(day FROM p_snapshot_month)<>1 OR p_snapshot_month>date_trunc('month',timezone('UTC',clock_timestamp()))::date THEN
    RAISE EXCEPTION 'El corte debe ser el primer día de un mes no futuro.';
  END IF;

  INSERT INTO app.admin_organization_monthly_snapshot_runs(snapshot_month,activity_from,activity_to)
  VALUES(p_snapshot_month,v_activity_from,v_activity_to)
  ON CONFLICT(snapshot_month) DO NOTHING;
  IF NOT FOUND THEN RETURN 0; END IF;

  WITH patient_usage AS (
    SELECT p.organization_id,count(*)::integer AS total
    FROM app.patients p
    JOIN app.patient_portal_access a ON a.organization_id=p.organization_id AND a.patient_id=p.id AND a.status='active'
    WHERE p.status='active' GROUP BY p.organization_id
  ), professional_usage AS (
    SELECT m.organization_id,count(*)::integer AS total
    FROM app.organization_members m
    WHERE m.role IN ('organization_owner','nutritionist') AND m.status='active'
    GROUP BY m.organization_id
  ), pdf_usage AS (
    SELECT split_part(o.name,'/',2)::uuid AS organization_id,
      sum(CASE WHEN o.metadata->>'size' ~ '^[0-9]+$' THEN (o.metadata->>'size')::bigint ELSE 0 END)::bigint AS total
    FROM storage.objects o
    WHERE o.bucket_id='educational-documents'
      AND split_part(o.name,'/',2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    GROUP BY split_part(o.name,'/',2)::uuid
  ), appointment_usage AS (
    SELECT a.organization_id,count(*)::integer AS total,
      count(*) FILTER (WHERE a.status='completed')::integer AS completed
    FROM app.appointments a WHERE a.starts_at>=v_activity_from AND a.starts_at<v_activity_to
    GROUP BY a.organization_id
  ), checkin_usage AS (
    SELECT r.organization_id,count(*)::integer AS total
    FROM app.check_in_responses r WHERE r.created_at>=v_activity_from AND r.created_at<v_activity_to
    GROUP BY r.organization_id
  ), publication_usage AS (
    SELECT v.organization_id,count(*)::integer AS total
    FROM app.meal_plan_versions v WHERE v.published_at>=v_activity_from AND v.published_at<v_activity_to
    GROUP BY v.organization_id
  ), snapshot_rows AS (
    SELECT o.id AS organization_id,
      (o.status='active' AND coalesce(s.status IN ('trialing','active','grace'),false)) AS customer_active,
      s.plan_slug,coalesce(p.total,0) AS active_patients,coalesce(m.total,0) AS active_professionals,
      coalesce(f.total,0) AS stored_pdf_bytes,coalesce(a.total,0) AS appointments,
      coalesce(a.completed,0) AS completed_appointments,coalesce(c.total,0) AS checkin_responses,
      coalesce(v.total,0) AS published_meal_plan_versions
    FROM app.organizations o
    LEFT JOIN app.organization_subscriptions s ON s.organization_id=o.id
    LEFT JOIN patient_usage p ON p.organization_id=o.id
    LEFT JOIN professional_usage m ON m.organization_id=o.id
    LEFT JOIN pdf_usage f ON f.organization_id=o.id
    LEFT JOIN appointment_usage a ON a.organization_id=o.id
    LEFT JOIN checkin_usage c ON c.organization_id=o.id
    LEFT JOIN publication_usage v ON v.organization_id=o.id
  )
  INSERT INTO app.admin_organization_monthly_snapshots(
    snapshot_month,organization_id,customer_active,plan_slug,active_patients,active_professionals,
    stored_pdf_bytes,appointments,completed_appointments,checkin_responses,published_meal_plan_versions
  )
  SELECT p_snapshot_month,organization_id,customer_active,plan_slug,active_patients,active_professionals,
    stored_pdf_bytes,appointments,completed_appointments,checkin_responses,published_meal_plan_versions
  FROM snapshot_rows;
  GET DIAGNOSTICS v_inserted=ROW_COUNT;

  UPDATE app.admin_organization_monthly_snapshot_runs SET organizations_seen=v_inserted WHERE snapshot_month=p_snapshot_month;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION app.capture_admin_organization_monthly_snapshot(date) FROM PUBLIC,anon,authenticated;
