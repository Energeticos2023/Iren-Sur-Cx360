const {test}=require('node:test'),assert=require('node:assert/strict');
const {overview,technicalReport}=require('../site/commissioning.cjs');
test('El control técnico conserva disciplinas y etapas sin inventar resultados cuando faltan registros',()=>{
 const result=overview([]);assert.equal(result.length,5);for(const d of result){assert.equal(d.systems.length,0);assert.equal(d.stages.length,7);assert.ok(d.stages.every(s=>!s.hasData));}
});
test('El sistema y TAG se vinculan a la etapa del protocolo y el cierre no se confunde con revisión',()=>{
 const records=[{id:'a',kind:'activity',specialty:'IIEE',payload:{code:'A',title:'SINTETICO',system_code:'SYN-S',equipment_tag:'TAG-1',stage:'PRUEBAS FUNCIONALES'}},{id:'p',kind:'protocol',specialty:'IIEE',payload:{stage:'PRUEBAS FUNCIONALES'}},{id:'t',kind:'test',specialty:'IIEE',state:'EN REVISION',payload:{activity_id:'a',protocol_id:'p',equipment_tag:'TAG-1'}}];
 const result=overview(records)[0],stage=result.stages.find(s=>s.stage==='PRUEBAS FUNCIONALES');assert.equal(stage.tests,1);assert.equal(stage.review,1);assert.equal(stage.closed,0);assert.deepEqual(result.systems[0].tags,['TAG-1']);
});
test('El reporte presenta medición cero, criterio, certificado, liberación y huella sin sustituir aceptación',()=>{
 const snapshot={cut:'2026-11-11T15:00:00Z',members:[],events:[],files:[{record_id:'t',name:'SINTETICO.pdf',sha256:'hash-sintetico'}],records:[
 {id:'d',kind:'document',state:'ACEPTADO',payload:{code:'DOC',revision:'R1'}},
 {id:'p',kind:'protocol',specialty:'IIEE',state:'PUBLICADO',payload:{code:'PROT',revision:'R2',document_id:'d',stage:'PRUEBAS FUNCIONALES',procedure_ref:'PROC-R1',fields:[{key:'x',label:'Lectura sintética',unit:'u',criterion:'Criterio sintético',source:'Fuente sintética'}]}},
 {id:'i',kind:'instrument',specialty:'IIEE',state:'ACEPTADO',payload:{code:'INS',certificate_ref:'CERT-SYN',valid_until:'2027-01-01'}},
 {id:'t',kind:'test',specialty:'IIEE',state:'EN REVISION',payload:{code:'TEST',title:'SINTETICO',protocol_id:'p',equipment_tag:'TAG-1',instrument_ids:['i'],ssoma:{release_ref:'LIB-SYN',permit:true},measurements:{x:{value:0,unit:'u',result:'NO CONFORME'}}}}
 ]};
 const rows=technicalReport(snapshot),text=JSON.stringify(rows),measurement=rows.find(r=>r[0]==='Lectura sintética');assert.equal(measurement[1],0);for(const expected of ['CERT-SYN','LIB-SYN','hash-sintetico','Criterio sintético','Fuente sintética','NO CONFORME','no emite aceptación contractual'])assert.ok(text.includes(expected),expected);assert.ok(rows.some(r=>r[0]==='Revisión independiente'&&r[1]==='PENDIENTE'));
});
