-- ============================================================
-- XIOMI DETALLES — Schema v3
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ============================================================
-- 1. PERFILES DE USUARIO (roles y nombres)
-- ============================================================
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  rol TEXT NOT NULL DEFAULT 'vendedor' CHECK (rol IN ('admin','vendedor','visor')),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON perfiles FOR ALL USING (auth.role() = 'authenticated');

-- Trigger: al crear usuario de auth, crear perfil automáticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, rol)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)), 'vendedor')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  notas TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON clientes FOR ALL USING (auth.role() = 'authenticated');

CREATE TRIGGER clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Agregar cliente_id a pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id);
CREATE INDEX IF NOT EXISTS pedidos_cliente_id_idx ON pedidos(cliente_id);

-- ============================================================
-- 3. MATERIALES VENDIBLES (peluches, etc.)
-- ============================================================
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS es_producto BOOLEAN DEFAULT FALSE;
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS precio_venta DECIMAL(10,2) DEFAULT 0;

-- ============================================================
-- 4. PRODUCTOS VINCULADOS A MATERIAL
-- (cuando el producto ES el material: peluche, etc.)
-- ============================================================
ALTER TABLE productos ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES materiales(id);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS descuenta_stock BOOLEAN DEFAULT FALSE;
-- descuenta_stock = TRUE → al entregar el pedido, se descuenta del material vinculado

-- ============================================================
-- 5. AJUSTES MANUALES DE STOCK
-- ============================================================
CREATE TABLE IF NOT EXISTS ajustes_stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID REFERENCES materiales(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','salida','correccion')),
  cantidad DECIMAL(10,2) NOT NULL,
  motivo TEXT,
  stock_antes DECIMAL(10,2),
  stock_despues DECIMAL(10,2),
  pedido_id UUID REFERENCES pedidos(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ajustes_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON ajustes_stock FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 6. FUNCIÓN: descontar stock al entregar pedido
-- ============================================================
CREATE OR REPLACE FUNCTION descontar_stock_pedido(p_pedido_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  item RECORD;
  mat  RECORD;
  nuevo_stock DECIMAL;
BEGIN
  FOR item IN
    SELECT ip.cantidad, ip.producto_id
    FROM items_pedido ip
    WHERE ip.pedido_id = p_pedido_id
  LOOP
    IF item.producto_id IS NOT NULL THEN
      SELECT p.material_id, p.descuenta_stock INTO mat
      FROM productos p WHERE p.id = item.producto_id;

      IF mat.descuenta_stock = TRUE AND mat.material_id IS NOT NULL THEN
        SELECT stock_actual INTO nuevo_stock FROM materiales WHERE id = mat.material_id;
        nuevo_stock := GREATEST(0, nuevo_stock - item.cantidad);

        UPDATE materiales SET stock_actual = nuevo_stock WHERE id = mat.material_id;

        INSERT INTO ajustes_stock (material_id, tipo, cantidad, motivo, stock_antes, stock_despues, pedido_id)
        VALUES (mat.material_id, 'salida', item.cantidad,
                'Venta - pedido #' || p_pedido_id::text,
                nuevo_stock + item.cantidad, nuevo_stock, p_pedido_id);
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- 7. TEMA DE COLORES en configuración
-- ============================================================
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('color_primario',   '#f43f8a', 'Color principal del sistema'),
  ('color_secundario', '#a8155a', 'Color secundario / acentuación')
ON CONFLICT (clave) DO NOTHING;

-- ============================================================
-- FIN Schema v3
-- ============================================================
