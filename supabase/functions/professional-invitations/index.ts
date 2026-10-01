import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const origins = new Set([
  'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174',
  // Internal staging is reached through the documented SSH tunnel to the VPS.
  'http://localhost:8080', 'http://127.0.0.1:8080',
]);
const cors = (request: Request) => origins.has(request.headers.get('Origin') ?? '') ? {
  'Access-Control-Allow-Origin': request.headers.get('Origin')!,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  Vary: 'Origin',
} : {};
const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error('Configuración incompleta.');
  return value;
};

Deno.serve(async request => {
  try {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(request) });
    if (request.method !== 'POST') return new Response('Método no permitido.', { status: 405, headers: cors(request) });
    const authorization = request.headers.get('Authorization');
    if (!authorization) throw new Error('No autorizado.');
    const body = await request.json() as { organization_id?: string; full_name?: string; email?: string };
    if (!body.organization_id || !body.full_name?.trim() || !body.email?.trim()) throw new Error('Completá nombre, consultorio y correo.');

    const url = env('SUPABASE_URL');
    const anonKey = env('SUPABASE_ANON_KEY');
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
    const redirectTo = Deno.env.get('APP_AUTH_REDIRECT_URL') ?? 'http://127.0.0.1:5174/?auth=invite';
    const userClient = createClient(url, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error('La sesión no es válida.');
    const { data: invitationRows, error: createError } = await userClient.schema('api').rpc('create_professional_invitation', {
      p_organization_id: body.organization_id,
      p_full_name: body.full_name.trim(),
      p_email: body.email.trim().toLowerCase(),
    });
    if (createError || !Array.isArray(invitationRows) || !invitationRows[0]?.invitation_id) {
      throw new Error(createError?.message ?? 'No pudimos preparar la invitación.');
    }
    const invitation = invitationRows[0] as { invitation_id: string };
    const service = createClient(url, serviceKey, { auth: { persistSession: false } });
    let delivery: 'sent' | 'existing_account' = 'sent';
    const { error: inviteError } = await service.auth.admin.inviteUserByEmail(body.email.trim().toLowerCase(), {
      data: { full_name: body.full_name.trim() },
      redirectTo,
    });
    if (inviteError?.message.toLowerCase().includes('already registered')) {
      const { error: magicLinkError } = await service.auth.signInWithOtp({
        email: body.email.trim().toLowerCase(),
        options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
      });
      if (magicLinkError) {
        await service.schema('api').rpc('set_professional_invitation_delivery', { p_invitation_id: invitation.invitation_id, p_delivery_status: 'failed' });
        throw new Error('La cuenta ya existe, pero no pudimos enviarle el enlace seguro de acceso.');
      }
      delivery = 'existing_account';
    } else if (inviteError) {
      await service.schema('api').rpc('set_professional_invitation_delivery', { p_invitation_id: invitation.invitation_id, p_delivery_status: 'failed' });
      throw new Error('La invitación quedó preparada, pero no pudimos enviar el correo. Podés reintentar o cancelarla.');
    }
    const { error: deliveryError } = await service.schema('api').rpc('set_professional_invitation_delivery', {
      p_invitation_id: invitation.invitation_id,
      p_delivery_status: delivery,
    });
    if (deliveryError) throw new Error('El correo salió, pero no pudimos actualizar su estado. Actualizá la pantalla antes de reintentar.');
    return Response.json({ invitation_id: invitation.invitation_id, delivery_status: delivery }, { headers: cors(request) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos procesar la invitación.';
    return Response.json({ message }, { status: 400, headers: cors(request) });
  }
});
