const {test}=require('node:test'),assert=require('node:assert/strict');
const pc=require('../site/plan-core.cjs');
const R=(kind,code,state,payload,specialty='IIEE')=>({id:kind+'-'+code,kind,state,specialty,payload:{code,title:'SINTÉTICO '+code,...payload}});
const today='2026-11-11';

test('Avisos ACONEX: vencido, por vencer, programado y registrado',()=>{
 const rs=[R('test','T1','NO INICIADO',{witness:'HP',aconex_notice_by:'2026-11-10',planned_start:'2026-11-24'}),R('test','T2','NO INICIADO',{witness:'HP',aconex_notice_by:'2026-11-15'}),
  R('test','T3','NO INICIADO',{witness:'HP',aconex_notice_by:'2026-12-30'}),R('test','T4','NO INICIADO',{witness:'HP',aconex_notice_by:'2026-11-01',aconex_notice_ref:'ANIN-EC-0001'}),
  R('test','T5','CERRADO',{witness:'HP',aconex_notice_by:'2026-11-01'}),R('test','T6','NO INICIADO',{witness:'WP/IP',aconex_notice_by:'2026-11-01'})];
 const f=pc.followup(rs,today);const by=Object.fromEntries(f.notices.map(n=>[n.record.payload.code,n.status]));
 assert.deepEqual(by,{T1:'VENCIDO',T2:'POR VENCER',T3:'PROGRAMADO',T4:'REGISTRADO'});
 assert.equal(f.counts.noticesOverdue,1);assert.equal(f.counts.noticesSoon,1);
});

test('Horizonte de 2 semanas incluye lo que empieza o sigue en curso y excluye lo cerrado o revocado',()=>{
 const rs=[R('activity','A1','NO INICIADO',{planned_start:'2026-11-20',planned_finish:'2026-11-20'}),R('activity','A2','EN PROCESO',{planned_start:'2026-11-01',planned_finish:'2026-11-30'}),
  R('activity','A3','NO INICIADO',{planned_start:'2026-12-20',planned_finish:'2026-12-20'}),R('test','A4','CERRADO',{planned_start:'2026-11-12'}),R('training','A5','REVOCADO',{planned_start:'2026-11-12'})];
 assert.deepEqual(pc.followup(rs,today).lookahead.map(x=>x.record.payload.code),['A2','A1']);
});

test('Vencidas: fecha de origen superada sin ejecución; documentos por fecha de presentación',()=>{
 const rs=[R('activity','V1','NO INICIADO',{planned_start:'2026-11-02',planned_finish:'2026-11-05'}),R('activity','V2','NO INICIADO',{planned_finish:'2026-11-05',actual_finish:'2026-11-05'}),
  R('test','V3','EN REVISION',{planned_finish:'2026-11-05'}),R('document','V4','BORRADOR',{planned_submit:'2026-11-09',planned_start:'2026-11-09',planned_finish:'2026-11-23'},null),
  R('activity','V5','NO INICIADO',{planned_finish:'2026-11-11'})];
 const f=pc.followup(rs,today);assert.deepEqual(f.overdue.map(x=>x.record.payload.code),['V1','V4']);
 assert.match(f.overdue[1].reason,/Presentación/);assert.equal(f.overdue[0].days,6);
});

test('Restricciones abiertas ordenadas con vencidas primero; cerradas excluidas',()=>{
 const rs=[R('restriction','D-1','EN PROCESO',{type:'DECISIÓN GP',due_date:'2026-12-01'}),R('restriction','D-2','EN PROCESO',{type:'DECISIÓN GP',due_date:'2026-11-09'}),R('restriction','R-1','CERRADO',{type:'RIESGO'})];
 const f=pc.followup(rs,today);assert.deepEqual(f.restrictions.map(x=>x.record.payload.code),['D-2','D-1']);assert.equal(f.counts.restrictionsOverdue,1);
});

test('Protocolos con criterios POR FIJAR no son publicables; secciones preservadas en orden',()=>{
 const p=R('protocol','P1','BORRADOR',{fields:[{key:'a',label:'A',criterion:'≥ 15 min',source:'S',section:'Pruebas'},{key:'b',label:'B',criterion:'POR FIJAR (V-01): x',source:'S',section:'Mediciones'},{key:'c',label:'C',criterion:'Conforme',source:'S',section:'Pruebas'}]});
 const st=pc.protocolStats(p);assert.equal(st.pending,1);assert.equal(st.publishable,false);assert.deepEqual(st.sections,['Pruebas','Mediciones']);
 assert.deepEqual(pc.groupFields(p.payload.fields).map(([s,fs])=>[s,fs.length]),[['Pruebas',2],['Mediciones',1]]);
 assert.equal(pc.protocolStats(R('protocol','P2','BORRADOR',{fields:[]})).publishable,false);
});

test('SÍ / NO / N.A. proponen resultados explícitos sin inventar valores',()=>{
 assert.equal(pc.checkResult('SÍ'),'CONFORME');assert.equal(pc.checkResult('NO'),'NO CONFORME');assert.equal(pc.checkResult('N.A.'),'NO VERIFICABLE');assert.equal(pc.checkResult(''),'');
});

test('Matriz sistema × nivel: cuenta niveles cerrados sobre niveles con prueba, sin porcentajes',()=>{
 const rs=[R('system','S1','BORRADOR',{}),R('system','S2','BORRADOR',{},'TIC'),R('test','t1','CERRADO',{system_code:'S1',level:'L2'}),R('test','t2','NO INICIADO',{system_code:'S1',level:'L4'}),
  R('test','t3','CERRADO',{system_code:'S2',level:'L4'},'TIC'),R('test','t4','REVOCADO',{system_code:'S2',level:'L5'},'TIC'),R('protocol','p1','BORRADOR',{system_code:'S1,S2',fields:[]},null)];
 const m=pc.matrix(rs);assert.equal(m.planned,3);assert.equal(m.closed,2);assert.equal(m.rows[0].protocols.length,1);
 const mt=pc.matrix(rs,'TIC');assert.deepEqual(mt.rows.map(r=>r.system.payload.code),['S2']);
});

test('Exportación de seguimiento conserva el corte y no agrega datos externos',()=>{
 const f=pc.followup([R('restriction','D-9','EN PROCESO',{type:'DECISIÓN GP'})],today);const rows=pc.followupRows(f);
 assert.deepEqual(rows[0],['Corte',today,'Horizonte hasta','2026-11-25']);assert.equal(rows.at(-1)[1],'D-9');
});
