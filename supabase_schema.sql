-- ============================================
-- XIOMI DETALLES — Esquema de Base de Datos
-- Ejecutar en el Editor SQL de Supabase
-- ============================================

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MATERIALES (inventario de insumos)
-- ============================================
CREATE TABLE materiales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT DEFAULT 'general',
  unidad TEXT DEFAULT 'unidad',
  stock_actual DECIMAL(10,2) DEFAULT 0,
  stock_minimo DECIMAL(10,2) DEFAULT 0,
  costo_unitario DECIMAL(10,2) DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMPRAS DE MATERIALES
-- ============================================
CREATE TABLE compras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  proveedor TEXT,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items de cada compra
CREATE TABLE items_compra (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  compra_id UUID REFERENCES compras(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materiales(id),
  material_nombre TEXT, -- guardado por si se borra el material
  cantidad DECIMAL(10,2) NOT NULL DEFAULT 1,
  costo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0
);

-- ============================================
-- PRODUCTOS DEL CATÁLOGO
-- ============================================
CREATE TABLE productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT DEFAULT 'general',
  precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0,
  costo_estimado DECIMAL(10,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PEDIDOS
-- ============================================
CREATE TABLE pedidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_pedido SERIAL,
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT,
  fecha_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega DATE,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_proceso','listo','entregado','cancelado')),
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  adelanto DECIMAL(10,2) DEFAULT 0,
  saldo DECIMAL(10,2) GENERATED ALWAYS AS (total - adelanto) STORED,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items de cada pedido
CREATE TABLE items_pedido (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  producto_nombre TEXT, -- guardado por si se borra el producto
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  notas_personalizacion TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0
);

-- ============================================
-- GASTOS VARIOS (no materiales)
-- ============================================
CREATE TABLE gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria TEXT DEFAULT 'otros',
  descripcion TEXT NOT NULL,
  monto DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER materiales_updated_at BEFORE UPDATE ON materiales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER productos_updated_at BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pedidos_updated_at BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE materiales    ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras       ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_compra  ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_pedido  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos        ENABLE ROW LEVEL SECURITY;

-- Políticas: solo usuarios autenticados pueden acceder
CREATE POLICY "auth_all" ON materiales   FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON compras      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON items_compra FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON productos    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON pedidos      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON items_pedido FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON gastos       FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- DATOS INICIALES DE EJEMPLO
-- ============================================
INSERT INTO categorias_material (nombre) VALUES
  ('Flores artificiales'),('Telas y cintas'),('Complementos'),
  ('Cajas y empaques'),('Luces LED'),('Peluches'),('Otros')
  ON CONFLICT DO NOTHING;

-- Materiales ejemplo
INSERT INTO materiales (nombre, categoria, unidad, stock_actual, stock_minimo, costo_unitario) VALUES
  ('Rosas eternas artificiales', 'Flores artificiales', 'unidad', 50, 10, 1.50),
  ('Tulipanes de tela', 'Flores artificiales', 'unidad', 30, 5, 1.20),
  ('Lirios de tela', 'Flores artificiales', 'unidad', 20, 5, 1.00),
  ('Cinta satinada rosa', 'Telas y cintas', 'metro', 15, 3, 0.80),
  ('Papel kraft', 'Complementos', 'pliego', 40, 10, 0.50),
  ('Luces LED pequeñas', 'Luces LED', 'unidad', 10, 3, 3.00),
  ('Tarjetas dedicatorias', 'Complementos', 'unidad', 100, 20, 0.30),
  ('Cajas negras medianas', 'Cajas y empaques', 'unidad', 15, 5, 4.00);

-- Productos ejemplo
INSERT INTO productos (nombre, categoria, precio_venta, costo_estimado) VALUES
  ('Ramo básico S/22', 'Ramos', 22, 8),
  ('Ramo intermedio S/46', 'Ramos', 46, 18),
  ('Caja personalizada con peluche S/78', 'Cajas', 78, 30),
  ('Caja letras LED S/80', 'Cajas LED', 80, 35),
  ('Ramo 25 rosas eternas S/98', 'Ramos eternos', 98, 40),
  ('Ramo 30 rosas eternas S/115', 'Ramos eternos', 115, 50);
