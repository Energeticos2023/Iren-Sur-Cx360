const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../site/acc-ui.js'),'utf8');
const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const ui=import(url);
test('pantalla ACC sin fichas distingue ausencia de datos de cero revisiones oficiales',async()=>{
 const {accScreen}=await ui;
 const html=accScreen({S:{member:{role:'admin',user_id:'u'},snapshot:{members:[]},accRows:[],accEntries:[]}});
 assert.match(html,/No existen revisiones ACC registradas/);
 assert.match(html,/NO acredita/);
 assert.match(html,/no consulta ni publica en ACC automáticamente/);
});
test('ficha ACC conserva estado, opinión y decisión final separados',async()=>{
 const {accScreen}=await ui;
 const S={member:{role:'especialista_anin',user_id:'u'},snapshot:{members:[]},
   accRows:[{id:'1',acc_review_number:'2641',document_code:'100021-XXX',document_revision:'C01',title:'Sistema de detección y alarma',workflow_state:'ABIERTO',document_status_code:'S4',verification_status:'POR_COTEJAR',final_decision:'NO_VERIFICADA',created_by:'u'}],
   accEntries:[{review_id:'1'}]};
 const html=accScreen({S});
 assert.match(html,/ACC #2641/);assert.match(html,/S4/);
 assert.match(html,/Sin decisión final verificada/);
 assert.match(html,/1 actuaciones/);
 assert.doesNotMatch(html,/Cotejar con ACC/);
});
test('datos de origen con HTML no ejecutan scripts al renderizar',async()=>{
 const {accScreen,reviewDetail}=await ui;
 const entry={id:'e1',review_id:'1',event_type:'INCIDENCIA_ACC',summary:'<img src=x onerror=alert(1)>',entered_by:'u'};
 const r={id:'1',acc_review_number:'2641',document_code:'CODE123',document_revision:'C01',title:'<script>alert(1)</script>',verification_status:'POR_COTEJAR',final_decision:'NO_VERIFICADA',workflow_state:'ABIERTO'};
 const S={member:{role:'admin',user_id:'u'},snapshot:{members:[]},accRows:[r],accEntries:[entry]};
 const html=accScreen({S})+reviewDetail(r,[entry],[]);
 assert.doesNotMatch(html,/<script>|<img/);
 assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);
});
test('formulario de entrada tiene autor oficial, incidencia, fecha, especialidad y referencia',async()=>{
 const {entryForm,verifyForm}=await ui;
 const r={id:'1',acc_review_number:'2641',document_code:'100021-A',document_revision:'C01'};
 const form=entryForm(r);
 for(const field of ['official_author','acc_issue_number','entry_date','specialty','official_ref','summary','required_action'])assert.match(form,new RegExp('name="'+field+'"'));
 assert.match(verifyForm(r),/cotejo independiente/i);
});
