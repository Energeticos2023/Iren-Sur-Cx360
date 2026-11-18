// IREN Sur · Alertas tempranas — acceso con la cuenta de CX360.
// El Registro se lee por RPC (cx_ew_snapshot), que exige membresía activa con rol admin, gp o riesgos.
// No hay claves ni datos del Registro en los archivos publicados.
import {createClient} from '@supabase/supabase-js';

const URL = 'https://azajuquqksrjyfbtcujq.supabase.co';
const KEY = __CX360_PUBLISHABLE_KEY__;
const db = createClient(URL, KEY, {auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: false}});

function message(error) {
  const m = String(error?.message || error || '');
  if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/email not confirmed/i.test(m)) return 'La cuenta aún no está activada. Pide un enlace al administrador de CX360.';
  if (/reservado|no tiene acceso/i.test(m)) return 'Tu cuenta no tiene acceso a las alertas tempranas. Lo habilita el administrador de CX360.';
  if (/failed to fetch|network|load failed/i.test(m)) return 'Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
  if (/jwt|session|refresh token/i.test(m)) return 'Tu sesión venció. Ingresa nuevamente.';
  return m || 'No se pudo completar la operación.';
}

export async function currentSession() {
  const {data, error} = await db.auth.getSession();
  if (error) throw Error(message(error));
  return data.session;
}

export async function signIn(email, password) {
  const {data, error} = await db.auth.signInWithPassword({email, password});
  if (error) throw Error(message(error));
  return data.session;
}

export async function signOut() {
  await db.auth.signOut({scope: 'local'});
}

export async function changePassword(password) {
  if (String(password || '').length < 12) throw Error('La contraseña debe tener al menos 12 caracteres.');
  const {error} = await db.auth.updateUser({password});
  if (error) throw Error(message(error));
}

const NAT = /ALERTA\s*TEMPRANA\s*N[°º.\s]*([0-9]+)/i;

// Convierte el corte guardado en CX360 (formato cx360-alertas-v1) al modelo de la consulta.
export function adapt(current) {
  const p = current?.payload || {};
  if (p.format !== 'cx360-alertas-v1' || !Array.isArray(p.alerts)) throw Error('El Registro guardado tiene un formato no reconocido.');
  const alerts = p.alerts.map((a, i) => {
    const idx = Number(a.idx) || i + 1, title = String(a.title || '');
    return {
      id: `${a.ref || ''}|${idx}|${i}`,
      index: a.at,
      code: String(a.ref || ''),
      number: title.match(NAT)?.[1] || String(a.at ?? ''),
      sourceRow: idx,
      date: a.ref_date || null,
      issuer: String(a.party || ''),
      component: String(a.tipo || ''),
      option: String(a.opcion || ''),
      title,
      status: String(a.estado || ''),
      specialty: String(a.especialidad || ''),
      actions: (a.actions || []).map((x, j) => ({
        row: idx * 1000 + j + 1,
        number: String(x.n ?? ''),
        text: String(x.desc || ''),
        owner: String(x.resp || ''),
        due: x.due || null,
        compliance: String(x.cumpl || '').toUpperCase(),
        status: String(x.estado || '')
      }))
    };
  });
  return {
    schemaVersion: 1,
    source: p.source_name || current.source_name || 'Registro de Alertas Tempranas',
    sheet: 'IREN -SUR',
    cutoff: p.cut_date || current.cut_date,
    sha256: null,
    serverId: current.id || null,
    loadedAt: current.loaded_at || null,
    fromServer: true,
    alerts
  };
}

export async function loadServerRegister() {
  const {data, error} = await db.rpc('cx_ew_snapshot');
  if (error) throw Error(message(error));
  if (!data?.current) throw Error('Todavía no hay un Registro cargado en la base de datos.');
  return adapt(data.current);
}
