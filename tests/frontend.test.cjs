const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../site/app.js'),'utf8').split('\nstart().catch')[0];
function context(){const el={innerHTML:''};const ctx=vm.createContext({console,Intl,Date,setTimeout,document:{querySelector:()=>el,addEventListener:()=>{}}});vm.runInContext(source,ctx);return {ctx,el};}
test('Una consulta fallida no produce ceros ni conserva datos anteriores',async()=>{const {ctx,el}=context();vm.runInContext("state.records={activities:[{code:'anterior'}]};fetchTable=async()=>{throw new Error('red')}",ctx);await assert.rejects(vm.runInContext('loadAll()',ctx),/red/);assert.equal(vm.runInContext('Object.keys(state.records).length',ctx),0);vm.runInContext('render()',ctx);assert.match(el.innerHTML,/Consulta no disponible/);assert.doesNotMatch(el.innerHTML,/Actividades de hoy/);});
test('Una recuperación completa restaura datos e indicadores',async()=>{const {ctx}=context();vm.runInContext("state.loadError='red';fetchTable=async table=>[{table}]",ctx);await vm.runInContext('loadAll()',ctx);assert.equal(vm.runInContext('state.loadError',ctx),null);assert.equal(vm.runInContext('Object.keys(state.records).length',ctx),9);});
test('El catálogo filtra actividades por sistema',()=>{const {ctx}=context();const html=vm.runInContext("state.selectedSystem='a';state.records={activities:[{system_id:'a',title:'Incluida'},{system_id:'b',title:'Ajena'}]};screenCronograma()",ctx);assert.match(html,/Incluida/);assert.doesNotMatch(html,/Ajena/);});
test('Los textos registrados escapan HTML',()=>{const {ctx}=context();assert.equal(vm.runInContext(`safe('<img onerror="alert(1)">')`,ctx),'&lt;img onerror=&quot;alert(1)&quot;&gt;');});

test('Sin universo acreditado el panel no publica ceros ni porcentajes de avance',()=>{
 const {ctx}=context();const html=vm.runInContext('screenHoy()',ctx);
 assert.match(html,/PLANIFICACIÓN PROVISIONAL/);assert.match(html,/NO CALCULABLE/);
 assert.match(html,/Numerador y denominador NO DISPONIBLES/);
 assert.doesNotMatch(html,/Pruebas verificadas|class="num">0<|\d+%/);
});

test('Una marca de aceptación y un cierre no acreditan verificación ni cumplimiento',()=>{
 const {ctx}=context();const html=vm.runInContext(`state.records={baselines:[{id:'b',code:'S',revision:'R1',state:'ACEPTADO_CON_EVIDENCIA',evidence_ref:'interno'}],tests:[{status:'CERRADO',performed_by:'u',verified_by:'u'}]};screenHoy()`,ctx);
 assert.match(html,/S \/ R1/);assert.match(html,/CRONOGRAMA NO ACREDITADO/);
 assert.match(html,/Pruebas con cierre reportado/);assert.match(html,/Verificación independiente y aceptación NO ACREDITADAS/);
 assert.doesNotMatch(html,/Pruebas verificadas/);
});

test('La propuesta no sustituye fechas ni oculta actividades vencidas y bloqueadas',()=>{
 const {ctx}=context();vm.runInContext(`state.records={activities:[{id:'a',planned_on:'2026-11-10',status:'BLOQUEADO'}],updates:[{activity_id:'a',proposed_on:'2026-12-01',state:'PROPUESTA'},{proposed_on:'2026-12-02',state:'DESCARTADA'}]}`,ctx);
 const before=vm.runInContext('JSON.stringify(state.records)',ctx);
 const result=vm.runInContext("controlSummary(state.records,'2026-11-11')",ctx);
 assert.equal(result.overdue.length,1);assert.equal(result.blocked.length,1);
 assert.equal(result.proposals.length,1);assert.equal(result.rows[0].planned_on,'2026-11-10');
 assert.equal(vm.runInContext('JSON.stringify(state.records)',ctx),before);
});

test('La agenda conserva disciplina, sistema, TAG, etapa, revisión y datos pendientes con escape HTML',()=>{
 const {ctx}=context();const html=vm.runInContext(`activityControlRow({specialty:'IIEE',system:{name:'Tablero <script>'},equipment_tag:'TAG-1',stage:'PRUEBAS FUNCIONALES',baseline:{code:'CR',revision:'R2'}})`,ctx);
 assert.match(html,/Instalaciones Eléctricas/);assert.match(html,/Tablero &lt;script&gt;/);
 assert.match(html,/TAG-1/);assert.match(html,/PRUEBAS FUNCIONALES/);assert.match(html,/CR \/ R2/);
 assert.match(html,/Responsable: PENDIENTE/);assert.match(html,/NO VERIFICADOS/);assert.match(html,/La fecha no libera la prueba/);
});

test('El corte usa la fecha de Lima aunque UTC ya esté en el día siguiente',()=>{
 const {ctx}=context();vm.runInContext(`Date=class extends Date {constructor(...args){super(...(args.length?args:['2026-11-12T02:00:00Z']))}}`,ctx);
 assert.equal(vm.runInContext('localDate()',ctx),'2026-11-11');
});

test('El control conserva actividades futuras sin disciplina válida y restricciones sin responsable',()=>{
 const {ctx}=context();const html=vm.runInContext(`state.records={activities:[{code:'FUTURA',title:'Actividad por clasificar',specialty:'OTRA',planned_on:'2099-01-01'}],observations:[{description:'Interfaz pendiente <img>',severity:'ALTA',state:'ABIERTA',next_action:'Definir interfaz'}]};screenHoy()`,ctx);
 assert.match(html,/Disciplina pendiente de validar/);assert.match(html,/FUTURA/);
 assert.match(html,/Interfaz pendiente &lt;img&gt;/);assert.match(html,/Definir interfaz/);
 assert.match(html,/Responsable: PENDIENTE/);assert.match(html,/Evidencia: NO DISPONIBLE/);
 for(const name of ['Instalaciones Eléctricas','Instalaciones Sanitarias','Instalaciones Mecánicas','Tecnologías y Comunicaciones','Equipamiento Médico'])assert.ok(html.includes(name));
});
