import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const apiUrl = 'http://127.0.0.1:54321';

function localStatus() {
  return JSON.parse(execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }));
}

function ensureServices() {
  execFileSync('docker', ['start', 'supabase_auth_nutrisoft', 'supabase_rest_nutrisoft', 'supabase_kong_nutrisoft'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function waitForAuth() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${apiUrl}/auth/v1/health`);
      if (response.ok) return;
    } catch {
      // Docker puede informar el contenedor activo antes de que Auth esté listo.
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Supabase Auth local no respondió dentro de los 15 segundos esperados.');
}

async function authenticatedClient(admin, publicKey, email) {
  const generated = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (generated.error) throw generated.error;
  const tokenHash = generated.data.properties?.hashed_token;
  if (!tokenHash) throw new Error(`No se generó un token local para ${email}.`);

  const client = createClient(apiUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: 'pkce' },
  });
  const verified = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (verified.error) throw verified.error;
  return client;
}

async function rows(client, relation) {
  const result = await client.schema('api').from(relation).select('*');
  if (result.error) throw new Error(`${relation}: ${result.error.message}`);
  return result.data ?? [];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

ensureServices();
await waitForAuth();
const status = localStatus();
const publicKey = status.PUBLISHABLE_KEY || status.ANON_KEY;
const admin = createClient(apiUrl, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const professional = await authenticatedClient(admin, publicKey, 'andrea@bienestar.test');
const professionalAccess = await professional.schema('api').rpc('get_current_access_context');
if (professionalAccess.error) throw professionalAccess.error;
assert(professionalAccess.data?.memberships?.some(item => item.role === 'nutritionist' && item.membership_status === 'active'), 'Andrea no obtuvo su membresía profesional activa.');

const [patients, plans, inbox, appointments, professionalLibrary] = await Promise.all([
  rows(professional, 'daily_patients'),
  rows(professional, 'professional_meal_plans'),
  rows(professional, 'attention_inbox'),
  rows(professional, 'appointments'),
  rows(professional, 'content_library'),
]);
assert(patients.length > 0, 'El recorrido profesional no devolvió pacientes autorizados.');
assert(patients.every(row => row.organization_id === '11111111-1111-4111-8111-111111111111'), 'El profesional recibió pacientes fuera de su consultorio.');
assert(plans.every(row => row.organization_id === '11111111-1111-4111-8111-111111111111'), 'El profesional recibió planes fuera de su consultorio.');
assert(inbox.every(row => row.organization_id === '11111111-1111-4111-8111-111111111111'), 'El profesional recibió avisos fuera de su consultorio.');
assert(appointments.every(row => row.organization_id === '11111111-1111-4111-8111-111111111111'), 'El profesional recibió citas fuera de su consultorio.');
assert(professionalLibrary.every(row => row.organization_id === '11111111-1111-4111-8111-111111111111'), 'El profesional recibió contenido fuera de su consultorio.');

const patient = await authenticatedClient(admin, publicKey, 'maria@paciente.test');
const patientAccess = await patient.schema('api').rpc('get_current_access_context');
if (patientAccess.error) throw patientAccess.error;
assert(patientAccess.data?.patient_accesses?.some(item => item.patient_id === 'f1111111-1111-4111-8111-111111111111'), 'María no obtuvo su acceso de paciente esperado.');

const [weights, checkins, patientPlans, patientAppointments, patientLibrary] = await Promise.all([
  rows(patient, 'daily_weights'),
  rows(patient, 'daily_checkins'),
  rows(patient, 'patient_current_meal_plans'),
  rows(patient, 'patient_appointments'),
  rows(patient, 'content_library'),
]);
for (const [name, visibleRows] of Object.entries({ weights, checkins, patientPlans, patientAppointments })) {
  assert(visibleRows.every(row => !row.patient_id || row.patient_id === 'f1111111-1111-4111-8111-111111111111'), `El paciente recibió filas ajenas en ${name}.`);
}
assert(patientLibrary.every(row => row.status === 'published'), 'El paciente recibió contenido no publicado.');

const forbiddenDirectory = await patient.schema('api').from('patient_directory').select('*');
assert(
  Boolean(forbiddenDirectory.error) || forbiddenDirectory.data?.every(row => row.id === 'f1111111-1111-4111-8111-111111111111'),
  'El paciente pudo consultar una ficha ajena en el directorio.',
);

await Promise.all([
  professional.auth.signOut({ scope: 'local' }),
  patient.auth.signOut({ scope: 'local' }),
]);

console.log('Recorridos clínicos Profesional/Paciente E2E local: PASS');
