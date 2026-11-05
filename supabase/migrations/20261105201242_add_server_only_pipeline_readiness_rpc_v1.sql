-- Exact version and SQL read back from Supabase migration history.
-- Requires the existing astra_private.pipeline_readiness_diagnostics view.
-- This migration is already applied on the approved AD ASTRA project.
CREATE FUNCTION public.astra_pipeline_readiness_v1()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
SET statement_timeout = '5000ms'
AS $function$
  SELECT jsonb_build_object(
    'schemaVersion', 1,
    'scope', 'ad-astra-private-pipeline-diagnostics',
    'releaseAuthorized', false,
    'snapshot', to_jsonb(d)
  ) FROM astra_private.pipeline_readiness_diagnostics AS d;
$function$;
REVOKE ALL ON FUNCTION public.astra_pipeline_readiness_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.astra_pipeline_readiness_v1() TO service_role;
COMMENT ON FUNCTION public.astra_pipeline_readiness_v1() IS 'Server-only read-only aggregate diagnostics. SECURITY INVOKER; no approval, provider, publication, account or billing side effects. No prompts, secrets, storage paths or customer records. Not a release certificate. Rollback: DROP FUNCTION public.astra_pipeline_readiness_v1();';
