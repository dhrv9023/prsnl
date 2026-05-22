-- ============================================================
-- H-6 fix: admin_credit_stats() RPC
--
-- Replaces the full table scan in admin stats endpoint.
-- Instead of fetching every profile row to Python and summing,
-- this does the aggregation in the DB in a single query.
--
-- Called from: backend/app/api/v1/endpoints/admin.py
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_credit_stats()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_granted',   COALESCE(SUM(total_credits_granted), 0),
    'total_remaining', COALESCE(SUM(remaining_credits), 0)
  )
  FROM public.profiles;
$$;

-- Only service_role (backend) should call this
REVOKE EXECUTE ON FUNCTION public.admin_credit_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_credit_stats() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_credit_stats() FROM anon;
