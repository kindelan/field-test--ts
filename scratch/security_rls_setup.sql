-- 1. Create Admins Table
CREATE TABLE IF NOT EXISTS public.app_admins (
  email text PRIMARY KEY
);

-- Note: Execute this to add yourself as an Administrator:
-- INSERT INTO public.app_admins (email) VALUES ('your-email@mahle.com');

-- 2. Helper Functions for Policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.app_admins 
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_mahle_employee()
RETURNS boolean AS $$
BEGIN
  RETURN (auth.jwt() ->> 'email') ILIKE '%@mahle.com' OR (auth.jwt() ->> 'email') ILIKE '%@mahle';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Enable RLS on all tables
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bike_component_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bike_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bike_field_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_ride_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_ride_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bike_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

-- 3.5 Policies for app_admins
DROP POLICY IF EXISTS "Allow select for authenticated on app_admins" ON public.app_admins;
CREATE POLICY "Allow select for authenticated on app_admins" ON public.app_admins
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow write for admins on app_admins" ON public.app_admins;
CREATE POLICY "Allow write for admins on app_admins" ON public.app_admins
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Policies for test_ride_feedback (Authenticated Inserts, Selective Select)
DROP POLICY IF EXISTS "Allow public insert on feedback" ON public.test_ride_feedback;
DROP POLICY IF EXISTS "Allow authenticated insert on feedback" ON public.test_ride_feedback;
CREATE POLICY "Allow authenticated insert on feedback" ON public.test_ride_feedback
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select for Mahle and Admins on feedback" ON public.test_ride_feedback;
CREATE POLICY "Allow select for Mahle and Admins on feedback" ON public.test_ride_feedback
  FOR SELECT TO authenticated USING (public.is_mahle_employee() OR public.is_admin());

DROP POLICY IF EXISTS "Allow full admin write on feedback" ON public.test_ride_feedback;
CREATE POLICY "Allow full admin write on feedback" ON public.test_ride_feedback
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. Policies for test_ride_log (Authenticated Inserts, Selective Select)
DROP POLICY IF EXISTS "Allow public insert on test_ride_log" ON public.test_ride_log;
DROP POLICY IF EXISTS "Allow authenticated insert on test_ride_log" ON public.test_ride_log;
CREATE POLICY "Allow authenticated insert on test_ride_log" ON public.test_ride_log
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select for Mahle and Admins on test_ride_log" ON public.test_ride_log;
CREATE POLICY "Allow select for Mahle and Admins on test_ride_log" ON public.test_ride_log
  FOR SELECT TO authenticated USING (public.is_mahle_employee() OR public.is_admin());

DROP POLICY IF EXISTS "Allow full admin write on test_ride_log" ON public.test_ride_log;
CREATE POLICY "Allow full admin write on test_ride_log" ON public.test_ride_log
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. Generic Policies for other metadata tables: Read for Authenticated, Write for Admin

-- bikes
DROP POLICY IF EXISTS "Select for Mahle and Admins on bikes" ON public.bikes;
DROP POLICY IF EXISTS "Allow public select on bikes" ON public.bikes;
DROP POLICY IF EXISTS "Allow authenticated select on bikes" ON public.bikes;
CREATE POLICY "Allow authenticated select on bikes" ON public.bikes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin write on bikes" ON public.bikes;
CREATE POLICY "Admin write on bikes" ON public.bikes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- bike_component_history
DROP POLICY IF EXISTS "Select for Mahle and Admins on comp_history" ON public.bike_component_history;
DROP POLICY IF EXISTS "Allow public select on comp_history" ON public.bike_component_history;
DROP POLICY IF EXISTS "Allow authenticated select on comp_history" ON public.bike_component_history;
CREATE POLICY "Allow authenticated select on comp_history" ON public.bike_component_history FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin write on comp_history" ON public.bike_component_history;
CREATE POLICY "Admin write on comp_history" ON public.bike_component_history FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- bike_history
DROP POLICY IF EXISTS "Select for Mahle and Admins on history" ON public.bike_history;
CREATE POLICY "Select for Mahle and Admins on history" ON public.bike_history FOR SELECT TO authenticated USING (public.is_mahle_employee() OR public.is_admin());
DROP POLICY IF EXISTS "Admin write on history" ON public.bike_history;
CREATE POLICY "Admin write on history" ON public.bike_history FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- field_test
DROP POLICY IF EXISTS "Select for Mahle and Admins on field_test" ON public.field_test;
DROP POLICY IF EXISTS "Allow public select on field_test" ON public.field_test;
DROP POLICY IF EXISTS "Allow authenticated select on field_test" ON public.field_test;
CREATE POLICY "Allow authenticated select on field_test" ON public.field_test FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin write on field_test" ON public.field_test;
CREATE POLICY "Admin write on field_test" ON public.field_test FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- bike_field_test
DROP POLICY IF EXISTS "Select for Mahle and Admins on bike_field_test" ON public.bike_field_test;
DROP POLICY IF EXISTS "Allow public select on bike_field_test" ON public.bike_field_test;
DROP POLICY IF EXISTS "Allow authenticated select on bike_field_test" ON public.bike_field_test;
CREATE POLICY "Allow authenticated select on bike_field_test" ON public.bike_field_test FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin write on bike_field_test" ON public.bike_field_test;
CREATE POLICY "Admin write on bike_field_test" ON public.bike_field_test FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- error_tags
DROP POLICY IF EXISTS "Select for Mahle and Admins on error_tags" ON public.error_tags;
CREATE POLICY "Select for Mahle and Admins on error_tags" ON public.error_tags FOR SELECT TO authenticated USING (public.is_mahle_employee() OR public.is_admin());
DROP POLICY IF EXISTS "Admin write on error_tags" ON public.error_tags;
CREATE POLICY "Admin write on error_tags" ON public.error_tags FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- bike_errors
DROP POLICY IF EXISTS "Select for Mahle and Admins on bike_errors" ON public.bike_errors;
CREATE POLICY "Select for Mahle and Admins on bike_errors" ON public.bike_errors FOR SELECT TO authenticated USING (public.is_mahle_employee() OR public.is_admin());
DROP POLICY IF EXISTS "Admin write on bike_errors" ON public.bike_errors;
CREATE POLICY "Admin write on bike_errors" ON public.bike_errors FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- notification_recipients
DROP POLICY IF EXISTS "Select for Mahle and Admins on recipients" ON public.notification_recipients;
CREATE POLICY "Select for Mahle and Admins on recipients" ON public.notification_recipients FOR SELECT TO authenticated USING (public.is_mahle_employee() OR public.is_admin());
DROP POLICY IF EXISTS "Admin write on recipients" ON public.notification_recipients;
CREATE POLICY "Admin write on recipients" ON public.notification_recipients FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
