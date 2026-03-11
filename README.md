# 🌸 Xiomi Detalles — Sistema de Gestión

Panel de administración completo para gestionar pedidos, inventario de materiales, compras y finanzas de tu negocio de detalles personalizados.

## ✨ Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| 📊 **Dashboard** | KPIs del negocio, ventas del mes, ganancias, stock bajo, pedidos recientes y gráficas |
| 🎁 **Pedidos** | CRUD completo de pedidos con estado, items, adelantos y saldos |
| 🌸 **Materiales** | Inventario de insumos con stock, alertas de stock bajo y valor en inventario |
| 🛍️ **Compras** | Registro de compras de materiales (actualiza stock automáticamente) |
| 📦 **Productos** | Catálogo de productos con precio, costo y margen de ganancia |
| 💸 **Gastos** | Gastos varios (transporte, empaques, servicios, etc.) |
| 📈 **Finanzas** | Reportes financieros con gráficas de ventas vs gastos, ganancia por mes |

---

## 🚀 Cómo desplegar en Netlify (paso a paso)

### Paso 1: Crear cuenta en Supabase

1. Ve a **[supabase.com](https://supabase.com)** → Crea una cuenta gratis
2. Crea un nuevo proyecto (elige la región más cercana, ej: São Paulo)
3. Anota tu **URL** y **anon key** (están en Settings → API)

### Paso 2: Configurar la base de datos

1. En Supabase, ve a **SQL Editor**
2. Copia y pega todo el contenido del archivo `supabase_schema.sql`
3. Ejecuta el script (botón Run)
4. Ve a **Authentication → Users** → crea tu usuario con email y contraseña

### Paso 3: Subir a GitHub

```bash
git init
git add .
git commit -m "Xiomi Detalles - Sistema de gestión"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/xiomi-detalles.git
git push -u origin main
```

### Paso 4: Desplegar en Netlify

1. Ve a **[netlify.com](https://netlify.com)** → Inicia sesión con GitHub
2. Click en **"Add new site" → "Import an existing project"**
3. Selecciona tu repositorio de GitHub
4. Configuración de build:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Click en **"Deploy site"**

### Paso 5: Configurar variables de entorno en Netlify

1. En Netlify → Site settings → **Environment variables**
2. Agrega estas variables:
   ```
   VITE_SUPABASE_URL     = https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGci...
   ```
3. Haz **re-deploy** del sitio

¡Listo! Tu sistema estará disponible en `https://tu-sitio.netlify.app`

---

## 💻 Desarrollo local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de entorno
cp .env.example .env
# Edita .env con tus credenciales de Supabase

# 3. Iniciar servidor de desarrollo
npm run dev
```

---

## 🗄️ Estructura del proyecto

```
src/
├── components/
│   ├── auth/       → Login
│   ├── layout/     → Sidebar, Layout principal
│   └── ui/         → Modal, StatCard (componentes reutilizables)
├── contexts/       → AuthContext (manejo de sesión)
├── lib/            → Cliente de Supabase
└── pages/          → Dashboard, Pedidos, Productos, Materiales, Compras, Gastos, Finanzas
```

---

## 🔒 Seguridad

- Login con email/contraseña via Supabase Auth
- Row Level Security (RLS) activo: solo usuarios autenticados acceden a los datos
- Variables de entorno para credenciales (nunca en el código)

---

## 🛠️ Stack tecnológico

- **Frontend:** React 18 + Vite
- **Estilos:** Tailwind CSS
- **Base de datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Gráficas:** Recharts
- **Hosting:** Netlify (gratis)
- **Iconos:** Lucide React

---

## 📱 Diseño responsivo

El sistema funciona en móviles, tablets y desktop. El sidebar se convierte en menú hamburguesa en pantallas pequeñas.

---

## 🌱 Próximas mejoras posibles

- [ ] Exportar reportes a Excel/PDF
- [ ] Notificaciones de WhatsApp para clientes
- [ ] Fotos de productos
- [ ] Múltiples usuarios/roles
- [ ] Recetas de materiales por producto

---

Hecho con 💕 para Xiomi Detalles
