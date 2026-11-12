// CX360 piloto: instalación móvil y retroalimentación; no almacena datos fuera de Supabase.
export function installGuide(button, platform = '') {
 const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
 const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent);
 const android=/Android/i.test(navigator.userAgent);
 const device=platform||(ios?'iOS':android?'Android':'otro');
 return `<h2>Instalar CX360 en mi celular</h2><p class="muted">Aplicación web instalable (PWA). No requiere App Store ni Play Store; el ingreso continúa siendo privado y exige una cuenta autorizada.</p>
 <div class="panel"><h3>Estado de instalación</h3><p>${standalone?'CX360 se está ejecutando desde la pantalla de inicio.':'Abra CX360 desde el navegador de su teléfono.'}</p>
 ${!standalone&&device==='Android'?button('Instalar en Android','install-now'):``}
 <div class="install-steps"><h3>Android (Chrome)</h3><p>1. Abra el enlace oficial de CX360 en Chrome. 2. Pulse «Instalar aplicación» si aparece; de lo contrario, menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio». 3. Abra el icono y acceda con su cuenta.</p><h3>iPhone (Safari)</h3><p>1. Abra CX360 en Safari. 2. Pulse Compartir (cuadro con flecha hacia arriba). 3. Seleccione «Añadir a pantalla de inicio», active «Abrir como app» si se ofrece y pulse Añadir. 4. Abra el icono y acceda con su cuenta.</p></div>
 <p class="notice">La instalación solo agrega un acceso directo con interfaz de aplicación. Se requiere internet para consultar y guardar registros. No hay captura de pruebas sin conexión.</p>
 <p class="small muted">Si no aparece la opción de instalación, actualice el navegador, use HTTPS y compruebe el acceso a la página. El botón automático depende del navegador.</p></div>`;
}
export function feedbackScreen(button,rows=[],member={}) {
 const admin=member.role==='admin';
 const own=admin?rows:rows.filter(x=>x.user_id===member.user_id);
 return `<h2>Observaciones y mejoras de CX360</h2><p class="muted">Canal de mejora del software, separado de incidencias técnicas ACC, NOD, SDI y aceptación contractual.</p>
 <div class="panel"><h3>Registrar sugerencia</h3><form id="pilot-feedback-form">
 <label class="label">Tipo<select class="input" name="category" required><option value="FUNCIONALIDAD">Funcionalidad faltante</option><option value="USABILIDAD">Facilidad de uso</option><option value="PROTOCOLO">Formato / protocolo</option><option value="DOCUMENTACION">Documentación</option><option value="ERROR">Error de la aplicación</option><option value="OTRO">Otro</option></select></label>
 <label class="label">Módulo o pantalla<input class="input" name="module" required minlength="2" maxlength="100" placeholder="Ej. Precomisionamiento"></label>
 <label class="label">Especialidad<select class="input" name="specialty"><option value="">General / multidisciplinaria</option><option>IIEE</option><option>IISS</option><option>IIMM</option><option>TIC</option><option>EM</option></select></label>
 <label class="label">Sistema o código (opcional)<input class="input" name="system_code" maxlength="60" placeholder="Ej. EL-01"></label>
 <label class="label">¿Qué falta o qué problema encontró?<textarea class="input" name="description" minlength="15" maxlength="3000" required></textarea></label>
 <label class="label">¿Cómo debería mejorar? (opcional)<textarea class="input" name="suggestion" maxlength="3000"></textarea></label>
 <button class="btn" type="submit">Enviar observación</button></form></div>
 <div class="panel section"><h3>${admin?'Observaciones del equipo':'Mis observaciones'} (${own.length})</h3>
 ${own.length?own.map(x=>`<article class="listitem"><strong>${esc(x.module)} · ${esc(x.category)}</strong><small>${esc(x.created_at)} · ${esc(x.status)} · ${esc(x.specialty||'General')}</small><p>${esc(x.description)}</p>${x.suggestion?`<p class="muted">Propuesta: ${esc(x.suggestion)}</p>`:''}</article>`).join(''):'<p class="muted">Sin observaciones registradas.</p>'}</div>`;
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
