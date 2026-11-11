"""Genera borradores locales desde fuentes reales; no sube ni acepta documentación.
Uso: python build-scope-pack.py --root <14 Comisionamiento> --out <private/paquete.json>
Las tablas DOCX se conservan con celdas y referencia PDF; cotejo visual pendiente.
"""
import argparse,hashlib,json,re,uuid,zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from pypdf import PdfReader

NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
NAMESPACE=uuid.UUID('65912a83-bba8-4686-96cc-0cf79e40ee7f')
def stable(key):return str(uuid.uuid5(NAMESPACE,key))
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def cell_text(cell):return ' '.join(t.text or '' for t in cell.findall('.//w:t',NS)).strip()
def source_record(path):
 h=digest(path)
 return {'id':stable('document:'+h),'kind':'document','specialty':None,'state':'BORRADOR','payload':{'code':'SRC-'+h[:12],'title':path.name,'revision':'PENDIENTE_DE_ACREDITAR','source_ref':path.name,'sha256':h}}

# Índices de tabla y páginas verificadas en los anexos entregados; no son IDs contractuales.
FORM_GROUPS={
 'IIEE':[(i,[i+25],[i+25]) for i in range(2,12)],
 'IISS':[(i,[i+21],[i+21]) for i in range(2,6)],
 'IIMM':[(3,[20],[20]),(4,[21],[21]),(5,[22],[22]),(6,[23,24],[23,24]),(7,[25],[25]),(8,[26],[26]),(9,[27],[27]),(10,[28],[28]),(11,[29],[29]),(12,[30],[30]),(13,[31],[31])],
 'TIC':[(i,[i+75],[i+75]) for i in range(2,7)],
 'EM':[(2,[18],[18], [2,3,4]),(5,[19],[19],[5,6]),(7,[20],[20],[7,8,9]),(10,[21],[21]),(11,[22],[22]),(12,[23],[23],[12,13,14]),(15,[24,25],[24,25]),(16,[26],[26],[16,17]),(18,[27],[27],[18,19]),(20,[28],[28]),(21,[29],[29],[21,22,23]),(24,[30],[30],[24,25]),(26,[31],[31],[26,27]),(28,[32],[32],[28,29,30]),(31,[33],[33],[31,32,33,34]),(35,[34],[34]),(36,[35],[35],[36,37]),(38,[37],[37])]
}
def form_title(tables,page_text):
 for table in tables:
  for row in table.findall('w:tr',NS):
   text=' '.join(cell_text(c) for c in row.findall('w:tc',NS)).strip()
   if re.match(r'^(Anexo\s+\d+\s*[ab]?\s*-|PROTOCOLO|REGISTRO|FORMATO|ACTA|FICHA TÉCNICA|RESULTADO DEL|PROGRAMA|PRESTACIÓN|COMPROMISO|DECLARACIÓN|CONSTANCIA)',text,re.I):return text
 lines=page_text.splitlines()
 return next((x.strip() for x in lines if re.match(r'^(PROTOCOLO|REGISTRO|FORMATO|ACTA|FICHA|PROGRAMA|PRESTACIÓN|COMPROMISO|DECLARACIÓN|CONSTANCIA|CERTIFICADO)',x.strip())), 'Formato fuente pendiente de título')
def make_tables(tables):
 result=[];fields=[]
 for ti,table in enumerate(tables):
  rows=[];signatures=False;section='Datos de fuente';previous=''
  for ri,row in enumerate(table.findall('w:tr',NS)):
   cells=row.findall('w:tc',NS);texts=[cell_text(c) for c in cells];joined=' '.join(texts)
   if re.search(r'POR EL EJECUTOR|Firma y sello|SUBCONTRATISTA.*ESPECIALISTA',joined,re.I):signatures=True
   if re.search(r'^\s*\d+[.\s-].*(DATOS|PRUEBA|INSPECCI|CARACTER|MEDICI|DOCUMENT|OBSERVA)',joined,re.I):section=joined[:180]
   current=[]
   for ci,cell in enumerate(cells):
    text=texts[ci];span=cell.find('w:tcPr/w:gridSpan',NS);colspan=int(span.get('{'+NS['w']+'}val','1')) if span is not None else 1
    merge=cell.find('w:tcPr/w:vMerge',NS);continuation=merge is not None and merge.get('{'+NS['w']+'}val')!='restart'
    inline_blank=bool(re.search(r'_{3,}|\.{4,}|…{2,}',text));printed=bool(re.fullmatch(r'\d+(?:[.,]\d+)?',text)) and ci>1
    editable=not signatures and not continuation and (not text or inline_blank or printed)
    key=f't{ti}_r{ri}_c{ci}';label=next((t for t in texts[:ci][::-1] if t),None) or previous or section
    item={'text':text,'colspan':colspan,'continuation':continuation,'editable':editable,'key':key,'printed_reference':text if printed else None}
    if editable:fields.append({'key':key,'label':label[:170]+f' [fila {ri+1}, celda {ci+1}]','unit':'','criterion':'','source':'CELDA_FUENTE_PENDIENTE_DE_MAPEO','role':'PENDIENTE_DE_CLASIFICAR','default':None})
    current.append(item)
   if any(texts):previous=next((t for t in texts if t),previous)
   rows.append(current)
  result.append({'rows':rows})
 return result,fields

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',required=True);ap.add_argument('--out',required=True);args=ap.parse_args()
 root=Path(args.root);out=Path(args.out);documents=[];systems=[];protocols=[];issues=[]
 plan=next(p for p in root.rglob('*.pdf') if p.name=='10 Plan de Comisionamiento[R].pdf');plan_doc=source_record(plan);documents.append(plan_doc);reader=PdfReader(plan);current=None;parts=[]
 for page_index in range(7,17):
  text=reader.pages[page_index].extract_text() or ''
  for line in text.splitlines():
   m=re.match(r'^(2\.([1-5])\.\d+)\s+(.+)',line.strip())
   if m:
    if current:current['payload']['scope_excerpt']='\n'.join(parts)
    code,family,title=m.groups();specialty={'1':'IIEE','2':'IISS','3':'IIMM','4':'TIC','5':'EM'}[family]
    current={'id':stable('system:'+plan_doc['payload']['sha256']+':'+code),'kind':'system','specialty':specialty,'state':'BORRADOR','payload':{'code':'CX-PLAN-'+code,'title':title.strip().rstrip('.'),'revision':'LECTURA-01','source_ref':plan.name+f' · numeral {code} · página PDF {page_index+1}','document_id':plan_doc['id'],'source_section':code,'source_page':page_index+1,'scope_origin':'EXPEDIENTE_PRESENTADO','scope_status':'PENDIENTE_DE_CONTRASTE','assets':[],'design_count':None,'field_count':None,'inventory_complete':False,'scope_items':[]}}
    systems.append(current);parts=[]
   elif current and not line.startswith(('“Mejoramiento','Enfermedades Neoplásicas','Plan de Comisionamiento','Clasificación')):parts.append(line)
 if current:current['payload']['scope_excerpt']='\n'.join(parts)
 for specialty,prefix in [('IIEE','10 Anexo'),('IISS','20 Anexo'),('IIMM','30 Anexo'),('TIC','40 Anexo'),('EM','50 Anexo')]:
  docx=next(root.rglob(prefix+'*.docx'));pdf=next(root.rglob(prefix+'*[[]R[]].pdf'));doc=source_record(pdf);doc['specialty']=specialty;documents.append(doc);pdf_reader=PdfReader(pdf)
  with zipfile.ZipFile(docx) as archive:tree=ET.fromstring(archive.read('word/document.xml'))
  all_tables=tree.findall('.//w:body/w:tbl',NS)
  for n,group in enumerate(FORM_GROUPS[specialty],1):
   index,pages,_=group[:3];indices=group[3] if len(group)>3 else [index];selected=[all_tables[i] for i in indices];page_text='\n'.join(pdf_reader.pages[i-1].extract_text() or '' for i in pages);title=form_title(selected,page_text);tables,fields=make_tables(selected)
   key=f'{specialty}-{n:02d}';locator=pdf.name+' · páginas PDF '+','.join(map(str,pages));
   for f in fields:f['source']=locator
   process='protocols'
   if re.search('CAPACIT',title,re.I):process='training'
   elif re.search('MANTENIMIENTO|MANUALES|SOPORTE|GARANT',title,re.I):process='om'
   elif re.search('INSPECCI|FICHA TÉCNICA',title,re.I):process='pre'
   protocols.append({'id':stable('form:'+doc['payload']['sha256']+':'+key),'kind':'protocol','specialty':specialty,'state':'BORRADOR','payload':{'code':'CX-FMT-'+key,'title':title,'revision':'TRANSCRIPCION-01','document_id':doc['id'],'source_ref':locator,'stage':'PRECOMISIONAMIENTO' if process=='pre' else 'CAPACITACION' if process=='training' else 'O&M' if process=='om' else 'PRUEBAS FUNCIONALES','process_key':process,'applicable_system_codes':[],'source_pdf_sha256':doc['payload']['sha256'],'source_docx_sha256':digest(docx),'source_pages':pages,'fields':fields,'form_schema':{'format':'word-table-v1','review_state':'PENDIENTE_DE_REVISION','tables':tables,'source_text':page_text,'answers':{},'signatures_are_source_only':True,'printed_values_are_not_results':True},'next_action':'Cotejar PDF/DOCX, mapear a sistema/TAG, clasificar campos y validar criterios antes de publicar.'}})
 # Texto narrativo de suministro de repuestos: no existe tabla Word; preservar como fuente, sin inventar formulario.
 em=next(root.rglob('50 Anexo*[[]R[]].pdf'));r=PdfReader(em);emdoc=next(d for d in documents if d['payload']['title']==em.name)
 protocols.append({'id':stable('form:'+emdoc['payload']['sha256']+':EM-repuestos'),'kind':'protocol','specialty':'EM','state':'BORRADOR','payload':{'code':'CX-FMT-EM-REP','title':'Declaración jurada de suministro de repuestos y accesorios','revision':'TRANSCRIPCION-01','document_id':emdoc['id'],'source_ref':em.name+' · página PDF 36','process_key':'om','stage':'O&M','fields':[],'form_schema':{'format':'source-text-v1','review_state':'PENDIENTE_DE_REVISION','source_text':r.pages[35].extract_text() or '','tables':[],'answers':{},'signatures_are_source_only':True,'printed_values_are_not_results':True}}})
 issues=[{'id':'REV-MT-01','source':'Anexo IIEE · PDF p.27','status':'PENDIENTE_DE_CONTRASTE','finding':'La identificación de equipos menciona 22.9 kV y una casilla de lectura menciona 10 kV. Confirmar diseño y fuente vigente antes de fijar criterio.'},{'id':'REV-GE-01','source':'Anexo IIEE · PDF p.15 y p.30','status':'PENDIENTE_DE_CONTRASTE','finding':'El procedimiento usa incrementos de carga de 25%; la tabla presenta escalones 0/20/40/60/80/100. Reconciliar método y registro.'},{'id':'REV-TIC-01','source':'Anexo TIC · PDF p.78','status':'PENDIENTE_DE_CONTRASTE','finding':'Título sonido/perifoneo, contenido cableado de incendio. No asignar por título únicamente.'},{'id':'REV-GAS-01','source':'Anexo IIMM · PDF p.13 y p.26','status':'PENDIENTE_DE_CONTRASTE','finding':'La expresión de pureza de aire/oxígeno requiere revisión técnica del sistema y fabricante; no usar un valor universal en aire medicinal.'},{'id':'REV-PT-01','source':'Planos IEL-E4-000079 y 000080','status':'PENDIENTE_DE_CONTRASTE','finding':'Son detalles constructivos, no inventario completo de pozos. Reconstruir cantidad y conexiones con plantas/unifilares y levantamiento físico.'},{'id':'REV-EM-01','source':'Anexo EM · PDF p.21-22','status':'PENDIENTE_DE_CONTRASTE','finding':'Tablas de pruebas sin procedimientos/resultados esperados específicos por equipo. Requieren propuesta de fabricante/contratista y revisión.'}]
 pack={'format':'cx360-scope-pack-v1','status':'BORRADOR_LOCAL_NO_ACEPTADO','documents':documents,'systems':systems,'protocols':protocols,'issues':issues,'constraints':['No contiene mediciones ejecutadas ni firmas.','Las propuestas no cambian el alcance ni activan protocolos.','El catálogo de sistemas requiere conciliación con anexos, planos, activos reales y revisión vigente.','Los formatos extraídos no están operativos hasta cotejo independiente y validación de criterios.']}
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(pack,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'systems':len(systems),'formats':len(protocols),'documents':len(documents),'fillable_cells':sum(len(p['payload']['fields']) for p in protocols),'output':str(out)},ensure_ascii=True))
if __name__=='__main__':main()
