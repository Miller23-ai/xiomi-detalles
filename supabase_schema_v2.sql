-- ============================================================
-- XIOMI DETALLES — Schema v2 (MEJORAS)
-- Ejecutar en el Editor SQL de Supabase DESPUÉS del schema v1
-- ============================================================

-- ============================================================
-- 1. CATEGORÍAS (para materiales y productos)
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('material', 'producto')),
  color TEXT DEFAULT '#f43f8a',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nombre, tipo)
);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON categorias FOR ALL USING (auth.role() = 'authenticated');

-- Categorías iniciales de materiales
INSERT INTO categorias (nombre, tipo) VALUES
  ('Flores artificiales', 'material'),
  ('Telas y cintas',      'material'),
  ('Complementos',        'material'),
  ('Cajas y empaques',    'material'),
  ('Luces LED',           'material'),
  ('Peluches',            'material'),
  ('Otros materiales',    'material')
ON CONFLICT (nombre, tipo) DO NOTHING;

-- Categorías iniciales de productos
INSERT INTO categorias (nombre, tipo) VALUES
  ('Ramos',          'producto'),
  ('Ramos eternos',  'producto'),
  ('Cajas',          'producto'),
  ('Cajas LED',      'producto'),
  ('Combos',         'producto'),
  ('Personalizados', 'producto'),
  ('Otros',          'producto')
ON CONFLICT (nombre, tipo) DO NOTHING;

-- ============================================================
-- 2. CONFIGURACIÓN DEL NEGOCIO (saldo inicial, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  valor TEXT,
  descripcion TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON configuracion FOR ALL USING (auth.role() = 'authenticated');

-- Valores por defecto
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('saldo_inicial',     '0',       'Saldo inicial de caja al comenzar a usar el sistema'),
  ('moneda',            'S/',      'Símbolo de moneda'),
  ('negocio_nombre',    'Xiomi Detalles', 'Nombre del negocio'),
  ('whatsapp_telefono', '',        'Número de WhatsApp del negocio (para recibir pedidos)'),
  ('whatsapp_mensaje_entrega', 
   '¡Hola {cliente}! 🌸 Tu pedido de *Xiomi Detalles* está listo para entregar. Total: *S/ {total}*. ¡Gracias por tu preferencia! 💕',
   'Mensaje de WhatsApp al marcar como listo')
ON CONFLICT (clave) DO NOTHING;

-- ============================================================
-- 3. FOTO EN PRODUCTOS
-- ============================================================
ALTER TABLE productos ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ============================================================
-- 4. SUPABASE STORAGE — bucket de fotos de productos
-- ============================================================
-- Ejecutar esto en el SQL Editor de Supabase:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'productos',
  'productos',
  true,
  5242880,  -- 5MB máximo por foto
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política de storage: cualquier usuario autenticado puede subir/leer
CREATE POLICY "auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'productos' AND auth.role() = 'authenticated'
  );

CREATE POLICY "public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'productos');

CREATE POLICY "auth_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'productos' AND auth.role() = 'authenticated'
  );

-- ============================================================
-- 5. FUNCIÓN PARA OBTENER MATERIALES CON STOCK BAJO
-- (reemplaza el bug de supabase.raw() en el frontend)
-- ============================================================
CREATE OR REPLACE FUNCTION get_materiales_stock_bajo()
RETURNS TABLE(id UUID, nombre TEXT, stock_actual DECIMAL, stock_minimo DECIMAL, unidad TEXT, categoria TEXT)
LANGUAGE SQL SECURITY DEFINER
AS $$
  SELECT id, nombre, stock_actual, stock_minimo, unidad, categoria
  FROM materiales
  WHERE stock_actual <= stock_minimo
  ORDER BY (stock_minimo - stock_actual) DESC
  LIMIT 10;
$$;

-- ============================================================
-- FIN del script v2
-- ============================================================
