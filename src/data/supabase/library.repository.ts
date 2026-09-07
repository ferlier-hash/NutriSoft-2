import { z } from 'zod';
import { getSupabaseClient } from '../../auth/supabase-client';

export const libraryBodySchema = z.object({
  ingredients: z.string().optional(), steps: z.string().optional(), tags: z.string().optional(), image: z.string().optional(),
  minutes: z.number().optional(), servings: z.number().optional(), calories: z.number().nullable().optional(),
  protein: z.number().nullable().optional(), carbs: z.number().nullable().optional(), fat: z.number().nullable().optional(),
  url: z.string().optional(), path: z.string().optional(), filename: z.string().optional(), sourceTitle: z.string().optional(),
});
const schema = z.object({ id: z.string(), organization_id: z.string(), owner_user_id: z.string(), title: z.string(), category: z.string(), kind: z.enum(['recipe','document','video']), status: z.enum(['draft','published','retired']), body: libraryBodySchema, updated_at: z.string() });
export type LibraryContent = z.infer<typeof schema>;
export type LibraryBody = z.infer<typeof libraryBodySchema>;
export async function loadLibrary() {
  const { data, error } = await getSupabaseClient().schema('api').from('content_library').select('*').order('updated_at', { ascending: false });
  if (error) throw new Error('No pudimos cargar la biblioteca. Reintentá.');
  return z.array(schema).parse(data);
}
export async function saveLibrary(item: Omit<LibraryContent, 'id'|'owner_user_id'|'updated_at'> & { id?: string; updated_at?: string }) {
  const { data, error } = await getSupabaseClient().schema('api').rpc('save_library_content', {
    p_id: item.id ?? null!, p_org_id: item.organization_id, p_kind: item.kind, p_title: item.title, p_category: item.category,
    p_status: item.status, p_body: item.body, p_expected_updated_at: item.updated_at ?? null!,
  });
  if (error) throw new Error('No se guardó. Revisá los datos; si otra pestaña lo modificó, cerrá y volvé a abrir el contenido.');
  return data;
}
export async function uploadLibraryPdf(file: File, organizationId: string) {
  if (file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024 || file.size === 0) throw new Error('Seleccioná un PDF de hasta 10 MB.');
  if (!(await file.slice(0,5).text()).startsWith('%PDF-')) throw new Error('El archivo no parece un PDF válido.');
  const client = getSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Volvé a iniciar sesión.');
  const path = `${user.id}/${organizationId}/${crypto.randomUUID()}.pdf`;
  const { error } = await client.storage.from('educational-documents').upload(path,file,{ contentType:'application/pdf',upsert:false });
  if (error) throw new Error('No pudimos subir el PDF. Reintentá.');
  return path;
}
export async function downloadLibraryPdf(item: LibraryContent) {
  const { data, error } = await getSupabaseClient().storage.from('educational-documents').download(item.body.path ?? '');
  if (error || !data) throw new Error('El documento ya no está disponible o no tenés acceso.');
  const url = URL.createObjectURL(data); const link = document.createElement('a');
  link.href=url; link.download=item.body.filename || 'recurso.pdf'; link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}
