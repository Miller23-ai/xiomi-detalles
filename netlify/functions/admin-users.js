// netlify/functions/admin-users.js
// Función serverless para gestión de usuarios con service_role key
// La service_role key NUNCA se expone al frontend

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async (req) => {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405 })
  }

  // Verificar token del usuario que hace la petición
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401 })

  // Verificar que el usuario es admin
  const { data: perfil } = await supabaseAdmin
    .from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') {
    return new Response(JSON.stringify({ error: 'Solo administradores pueden gestionar usuarios' }), { status: 403 })
  }

  const body = await req.json()
  const { accion } = body

  try {
    if (accion === 'listar') {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
      const { data: perfiles } = await supabaseAdmin.from('perfiles').select('*')
      const perfilMap = {}
      perfiles?.forEach(p => { perfilMap[p.id] = p })
      const result = users.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        ...perfilMap[u.id],
      }))
      return new Response(JSON.stringify({ users: result }), { status: 200 })
    }

    if (accion === 'crear') {
      const { email, password, nombre, rol } = body
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre }
      })
      if (error) throw error
      // Insertar/actualizar perfil
      await supabaseAdmin.from('perfiles').upsert({ id: data.user.id, nombre, rol: rol || 'vendedor' })
      return new Response(JSON.stringify({ ok: true, user: data.user }), { status: 200 })
    }

    if (accion === 'cambiar_password') {
      const { userId, password } = body
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password })
      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    if (accion === 'actualizar_perfil') {
      const { userId, nombre, rol } = body
      await supabaseAdmin.from('perfiles').upsert({ id: userId, nombre, rol })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    if (accion === 'desactivar') {
      const { userId } = body
      await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876600h' })
      await supabaseAdmin.from('perfiles').update({ activo: false }).eq('id', userId)
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    return new Response(JSON.stringify({ error: 'Acción desconocida' }), { status: 400 })
  } catch (err) {
    console.error('Admin error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), { status: 500 })
  }
}

export const config = { path: '/api/admin-users' }
