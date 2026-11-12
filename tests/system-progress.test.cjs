'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),m=require('../site/system-progress.cjs');
const sys=(code='EL-03',specialty='IIEE')=>({id:'SYS-'+code,kind:'system',state:'BORRADOR',specialty,payload:{code,title:code}});
const sched=(state='ACEPTADO_CON_EVIDENCIA')=>({id:'SCH',kind:'schedule',state,payload:{code:'PRG',revision:'C02',activities:[
 {code:'A',specialty:'IIEE',system_code:'EL-03',stage:'PRECOMISIONAMIENTO'},
 {code:'B',specialty:'IIEE',system_code:'EL-03',stage:'PRUEBAS FUNCIONALES'},
 {code:'C',specialty:'IIEE',system_code:'EL-03',stage:'PRUEBAS INTEGRADAS'},
 {code:'D',specialty:'IIEE',system_code:'EL-03',stage:'O&M'},
 {code:'E',specialty:'IIEE',system_code:'EL-01..EL-07',stage:'CAPACITACION'},
 {code:'F',specialty:'IIEE',system_code:'EL-04',stage:'PRECOMISIONAMIENTO'},
]}});
const act=code=>({id:'ACT-'+code,kind:'activity',specialty:'IIEE',state:'NO INICIADO',payload:{source_activity_code:code,schedule_id:'SCH',system_code:'EL-03'}});
const cov=(code,state='CERRADO')=>({id:'COV-'+code,kind:'coverage',state,payload:{activity_id:'ACT-'+code}});
test('Sin vigencia formal no se publica un cero ni porcentaje inventado',()=>{
 const p=m.bySystem([sys(),sched(),act('A'),cov('A')],sys(),null,'2026-11-12');
 assert.equal(p.calculable,false);assert.equal(p.percent,null);assert.equal(p.numerator,null);
});
test('Un cronograma en borrador no habilita porcentaje',()=>{
 assert.equal(m.bySystem([sys(),sched('BORRADOR'),act('A'),cov('A')],sys(),'SCH').calculable,false);
});
test('Avance por sistema, fases, revision y coberturas aceptadas',()=>{
 const rows=[sys(),sched(),act('A'),act('B'),act('C'),act('D'),act('E'),cov('A'),cov('B','ACEPTADO'),cov('C','REVOCADO'),cov('E'),{...cov('A'),id:'DUP'}];
 const p=m.bySystem(rows,sys(),'SCH','2026-11-12');
 assert.deepEqual([p.numerator,p.denominator,p.percent,p.accepted,p.revision],[3,5,60,1,'C02']);
 assert.deepEqual(p.phases.map(x=>x.percent),[100,100,0,0,100]);
});
test('Prueba cerrada sin cobertura independiente NO genera avance',()=>{
 const p=m.bySystem([sys(),sched(),act('A'),{id:'T',kind:'test',state:'CERRADO',payload:{system_code:'EL-03'}}],sys(),'SCH');
 assert.equal(p.percent,0);assert.equal(p.denominator,5);
});
test('No cruza sistemas ni cronogramas antiguos',()=>{
 const rows=[sys(),sched(),act('A'),{...act('F'),id:'ACT-F'},cov('F'),{...cov('A'),payload:{activity_id:'INVALID'}},
 {id:'OLD-ACT',kind:'activity',specialty:'IIEE',payload:{schedule_id:'ANT',source_activity_code:'B',system_code:'EL-03'}},
 {id:'OLD-COV',kind:'coverage',state:'ACEPTADO',payload:{activity_id:'OLD-ACT'}}];
 assert.equal(m.bySystem(rows,sys(),'SCH').numerator,0);
 assert.equal(m.bySystem(rows,sys('SA-01','IISS'),'SCH').calculable,false);
});
test('Actividades duplicadas o universo vacio bloquean calculo',()=>{
 const s=sched();s.payload.activities.push({...s.payload.activities[0]});
 assert.equal(m.bySystem([sys(),s],sys(),'SCH').calculable,false);
 assert.equal(m.bySystem([sys('EL-10'),sched()],sys('EL-10'),'SCH').calculable,false);
});
test('Lista y rango de sistemas sin falsos positivos',()=>{
 assert.equal(m.includesSystem('EL-01..EL-07','EL-05'),true);
 assert.equal(m.includesSystem('EL-03,TI-00','TI-00'),true);
 assert.equal(m.includesSystem('EL-01','EL-010'),false);
 assert.equal(m.includesSystem('EL-01','EL-02'),false);
});
