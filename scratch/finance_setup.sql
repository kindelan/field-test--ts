-- 1. Create Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  provider text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  start_date date NOT NULL,
  end_date date NOT NULL,
  file_name text,
  file_url text, -- Base64 encoded file content
  field_test_id uuid REFERENCES public.field_test(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Invoice Bikes Join Table
CREATE TABLE IF NOT EXISTS public.invoice_bikes (
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  bike_id uuid REFERENCES public.bikes(id) ON DELETE CASCADE,
  PRIMARY KEY (invoice_id, bike_id)
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_bikes ENABLE ROW LEVEL SECURITY;

-- 4. Policies for public.invoices
DROP POLICY IF EXISTS "Allow select for authenticated on invoices" ON public.invoices;
CREATE POLICY "Allow select for authenticated on invoices" ON public.invoices
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow write for admins on invoices" ON public.invoices;
CREATE POLICY "Allow write for admins on invoices" ON public.invoices
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. Policies for public.invoice_bikes
DROP POLICY IF EXISTS "Allow select for authenticated on invoice_bikes" ON public.invoice_bikes;
CREATE POLICY "Allow select for authenticated on invoice_bikes" ON public.invoice_bikes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow write for admins on invoice_bikes" ON public.invoice_bikes;
CREATE POLICY "Allow write for admins on invoice_bikes" ON public.invoice_bikes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
