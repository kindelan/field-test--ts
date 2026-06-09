-- 1. Crear el bucket 'invoices' en storage si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas para permitir el acceso y gestión del bucket 'invoices'

-- Permitir lectura pública de facturas a cualquier usuario
DROP POLICY IF EXISTS "Permitir lectura publica de facturas" ON storage.objects;
CREATE POLICY "Permitir lectura publica de facturas" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'invoices');

-- Permitir a usuarios autenticados subir archivos
DROP POLICY IF EXISTS "Permitir subida a usuarios autenticados" ON storage.objects;
CREATE POLICY "Permitir subida a usuarios autenticados" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'invoices');

-- Permitir a usuarios autenticados eliminar sus archivos
DROP POLICY IF EXISTS "Permitir borrado a usuarios autenticados" ON storage.objects;
CREATE POLICY "Permitir borrado a usuarios autenticados" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'invoices');
