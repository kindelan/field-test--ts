-- ============================================================================
-- Security Hardening Migration for field-test--ts
-- Execute in Supabase SQL Editor (idempotent)
-- ============================================================================

-- 1. Harden SECURITY DEFINER helper functions with explicit search_path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.app_admins
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_mahle_employee()
RETURNS boolean AS $$
BEGIN
  RETURN (auth.jwt() ->> 'email') ILIKE '%@mahle.com'
      OR (auth.jwt() ->> 'email') ILIKE '%@mahle';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Restrict app_admins SELECT so regular authenticated users cannot enumerate all admins
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for authenticated on app_admins" ON public.app_admins;
DROP POLICY IF EXISTS "Allow self or admin select on app_admins" ON public.app_admins;
CREATE POLICY "Allow self or admin select on app_admins" ON public.app_admins
  FOR SELECT TO authenticated
  USING (
    LOWER(email) = LOWER(auth.jwt() ->> 'email')
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Allow write for admins on app_admins" ON public.app_admins;
CREATE POLICY "Allow write for admins on app_admins" ON public.app_admins
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Harden test_ride_feedback INSERT so riders cannot spoof another rider's email
ALTER TABLE public.test_ride_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert on feedback" ON public.test_ride_feedback;
DROP POLICY IF EXISTS "Allow authenticated insert on feedback" ON public.test_ride_feedback;
DROP POLICY IF EXISTS "Allow authenticated insert own feedback" ON public.test_ride_feedback;
CREATE POLICY "Allow authenticated insert own feedback" ON public.test_ride_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR LOWER(COALESCE(rider_email, '')) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  );

-- 4. Add sanity constraints on test_ride_log (NOT VALID preserves legacy rows while enforcing on all new writes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_test_ride_log_distance_reasonable'
  ) THEN
    ALTER TABLE public.test_ride_log
      ADD CONSTRAINT chk_test_ride_log_distance_reasonable
      CHECK (distance_km IS NULL OR (distance_km > 0 AND distance_km < 1000)) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_test_ride_log_elevation_reasonable'
  ) THEN
    ALTER TABLE public.test_ride_log
      ADD CONSTRAINT chk_test_ride_log_elevation_reasonable
      CHECK (elevation_m IS NULL OR (elevation_m >= 0 AND elevation_m < 15000)) NOT VALID;
  END IF;
END $$;

-- 5. Unify review_questions RLS policies to use public.is_admin() (case-insensitive)
DO $$
BEGIN
  IF to_regclass('public.review_questions') IS NOT NULL THEN
    ALTER TABLE public.review_questions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins can insert questions" ON public.review_questions;
    DROP POLICY IF EXISTS "Admins can update questions" ON public.review_questions;
    DROP POLICY IF EXISTS "Admins can delete questions" ON public.review_questions;
    DROP POLICY IF EXISTS "Allow full admin write on review_questions" ON public.review_questions;

    CREATE POLICY "Allow full admin write on review_questions" ON public.review_questions
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- 6. Harden invoices & invoice_bikes tables (Mahle/Admins read, Admins write)
DO $$
BEGIN
  IF to_regclass('public.invoices') IS NOT NULL THEN
    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow select for Mahle and Admins on invoices" ON public.invoices;
    CREATE POLICY "Allow select for Mahle and Admins on invoices" ON public.invoices
      FOR SELECT TO authenticated
      USING (public.is_mahle_employee() OR public.is_admin());

    DROP POLICY IF EXISTS "Allow full admin write on invoices" ON public.invoices;
    CREATE POLICY "Allow full admin write on invoices" ON public.invoices
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF to_regclass('public.invoice_bikes') IS NOT NULL THEN
    ALTER TABLE public.invoice_bikes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow select for Mahle and Admins on invoice_bikes" ON public.invoice_bikes;
    CREATE POLICY "Allow select for Mahle and Admins on invoice_bikes" ON public.invoice_bikes
      FOR SELECT TO authenticated
      USING (public.is_mahle_employee() OR public.is_admin());

    DROP POLICY IF EXISTS "Allow full admin write on invoice_bikes" ON public.invoice_bikes;
    CREATE POLICY "Allow full admin write on invoice_bikes" ON public.invoice_bikes
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- 7. Make Storage bucket 'invoices' private and restrict access (Mahle/Admins read, Admins write/delete)
UPDATE storage.buckets
SET public = false
WHERE id = 'invoices';

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON storage.objects;
DROP POLICY IF EXISTS "Invoices read for Mahle and Admins" ON storage.objects;
DROP POLICY IF EXISTS "Invoices admin write" ON storage.objects;
DROP POLICY IF EXISTS "Invoices admin delete" ON storage.objects;

CREATE POLICY "Invoices read for Mahle and Admins" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'invoices'
    AND (public.is_mahle_employee() OR public.is_admin())
  );

CREATE POLICY "Invoices admin write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'invoices'
    AND public.is_admin()
  );

CREATE POLICY "Invoices admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'invoices'
    AND public.is_admin()
  );
