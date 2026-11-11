-- CX360 v2.3: Asistente Cx con glosario, guías curadas y sinónimos administrables.
-- Contenido documental fuera de Git (cx_private). Aquí solo estructura, sinónimos y lógica de búsqueda.
begin;

alter table cx_private.kb_docs drop constraint if exists kb_docs_nature_check;
alter table cx_private.kb_docs add constraint kb_docs_nature_check check (nature in ('contractual','cliente','propuesta','guia'));

-- Sinónimos y siglas: «term» es un fragmento de expresión regular sobre la pregunta (minúsculas, sin tildes).
create table if not exists cx_private.kb_synonyms (
 term text not null,
 expansion text not null,
 weight numeric not null check (weight > 0 and weight <= 1),
 primary key (term, expansion)
);
revoke all on table cx_private.kb_synonyms from public, anon, authenticated;

insert into cx_private.kb_synonyms(term, expansion, weight) values
 ('iiee','instalaciones electricas electrico',0.9),('iiss','instalaciones sanitarias sanitario',0.9),('iimm','instalaciones mecanicas mecanico',0.9),
 ('tic','tecnologias informacion comunicaciones',0.9),('instalaciones? electricas?|sistema electrico|especialidad electrica','iiee',0.6),
 ('instalaciones? sanitarias?','iiss',0.6),('instalaciones? mecanicas?','iimm',0.6),('equipamiento medico|equipos? medicos?|biomedic\w*','equipamiento medico biomedico',0.9),
 ('precomisionamiento|pre-? ?comisionamiento','precomisionamiento L2',0.9),
 ('precomisionamiento|pre-? ?comisionamiento','actividades previas preliminares montaje inspeccion recepcion verificacion pruebas estaticas liberacion',0.45),
 ('l1','recepcion fat',0.9),('l2','precomisionamiento',0.9),('l3','arranque energizacion',0.9),('l4','prueba funcional',0.9),('l5','prueba integrada',0.9),
 ('arranque','puesta marcha energizacion L3',0.6),('puesta en marcha','arranque puesta servicio',0.6),('puesta en servicio','arranque energizacion',0.6),
 ('pruebas? funcional(es)?','L4 funcional',0.6),('pruebas? integradas?','escenario integrada L5',0.6),
 ('que significa|que quiere decir|significado|definicion|definir|sigla|siglas|acronimo','glosario siglas significa',0.6),
 ('epp','equipos proteccion personal',0.9),('epc','equipos proteccion colectiva',0.9),('ge','grupo electrogeno',0.9),('tta','tablero transferencia automatica',0.9),
 ('mt','media tension',0.9),('bt','baja tension',0.9),('ups','sai',0.9),('sai','ups',0.9),('daci','deteccion alarma incendios',0.9),
 ('aci','agua contra incendio',0.9),('hvac','aire acondicionado ventilacion',0.9),('uma','unidad manejadora aire',0.9),
 ('oym','operacion mantenimiento',0.9),('o&m','operacion mantenimiento oym',0.9),('cctv','videovigilancia camaras',0.9),('loto','bloqueo etiquetado',0.9),
 ('petar','permiso escrito trabajo alto riesgo',0.9),('ats','analisis seguro trabajo',0.9),('iperc','identificacion peligros riesgos',0.9),
 ('fat','pruebas fabrica',0.9),('sc3','culminacion seccional',0.9),('ascensor','montacargas transporte vertical',0.9),('montacargas','ascensor transporte vertical',0.9),
 ('trafo','transformador',0.9),('transformador','trafo',0.6),('spda|pararrayos?','puesta tierra spda descargas atmosfericas',0.9),
 ('pozos? a tierra|puesta a tierra','puesta tierra resistencia telurometro equipotencialidad',0.6),
 ('oxigeno','manifold gases medicinales',0.45),('megometro|megger','medidor aislamiento',0.9),('telurometro','resistencia puesta tierra',0.9),
 ('hp','prueba presenciada aviso',0.45),('testificacion','prueba presenciada aviso',0.9),('presenciadas?','testificacion aviso',0.45),
 ('herramientas','instrumentos equipos',0.45),('instrumentos|equipos de medicion','herramientas medicion calibracion instrumentos',0.45),('equipos','herramientas instrumentos',0.45),
 ('formatos?|protocolos?|registros?','formatos protocolos registros anexo',0.45),
 ('protocolos? de pruebas?','estructura procedimientos protocolos formato',0.45),
 ('alcance','objetivo sistemas',0.45),('capacitacion','entrenamiento formacion',0.45),('seguridad','ssoma epp bloqueo',0.45)
on conflict (term, expansion) do nothing;

create or replace function public.cx_kb_search(p_query text, p_limit integer default 8, p_specialty text default null, p_docs text[] default null)
returns table (id text, doc text, doc_title text, nature text, sec text, title text, page_from integer, page_to integer,
               systems text[], snippet text, body text, score real)
language plpgsql stable security definer set search_path='' as $$
#variable_conflict use_column
declare
 cfg constant regconfig := 'cx_private.cx_es'::regconfig;
 q_and tsquery; q_or tsquery; codes text[]; norm text; n_total integer; exp_w jsonb; doc_hint text[]; spec_hint text[]; spec_docs text[];
 lim integer := least(greatest(coalesce(p_limit,8),1),15);
begin
 if (cx_private.member()).user_id is null then raise exception 'Consulta reservada a miembros activos de CX360'; end if;
 if p_query is null or length(trim(p_query)) < 2 then return; end if;
 if length(p_query) > 2000 then raise exception 'Consulta demasiado larga'; end if;
 norm := lower(extensions.unaccent('extensions.unaccent'::regdictionary, p_query));
 select coalesce(jsonb_object_agg(x.lex, x.wt), '{}'::jsonb) into exp_w from (
  select l as lex, max(s.weight) as wt
  from cx_private.kb_synonyms s, unnest(tsvector_to_array(to_tsvector(cfg, s.expansion))) l
  where norm ~ ('\m(' || s.term || ')\M')
  group by l) x;
 -- Especialidad aludida (siglas o nombre) y documentos citados expresamente.
 spec_hint := array_remove(array[
  case when norm ~ '\m(iiee|instalaciones? electricas?|sistema electrico|especialidad electrica)\M' then 'IIEE' end,
  case when norm ~ '\m(iiss|instalaciones? sanitarias?|sanitari\w*)\M' then 'IISS' end,
  case when norm ~ '\m(iimm|instalaciones? mecanicas?|mecanic\w*)\M' then 'IIMM' end,
  case when norm ~ '\m(tic|tecnologias? de (la )?informacion)\M' then 'TIC' end,
  case when norm ~ '\m(equipamiento medico|equipos? medicos?|biomedic\w*)\M' then 'EM' end], null);
 spec_docs := array(select ('AN' || (array_position(array['IIEE','IISS','IIMM','TIC','EM'], s))::text) from unnest(spec_hint) s);
 doc_hint := array_remove(array[
  case when norm ~ '\manexo\s*n?[°º.]?\s*12\M' then 'A12' end, case when norm ~ '\manexo\s*n?[°º.]?\s*16\M' then 'A16' end,
  case when norm ~ '\manexo\s*n?[°º.]?\s*0?1\M' then 'AN1' end, case when norm ~ '\manexo\s*n?[°º.]?\s*0?2\M' then 'AN2' end,
  case when norm ~ '\manexo\s*n?[°º.]?\s*0?3\M' then 'AN3' end, case when norm ~ '\manexo\s*n?[°º.]?\s*0?4\M' then 'AN4' end,
  case when norm ~ '\manexo\s*n?[°º.]?\s*0?5\M' then 'AN5' end, case when norm ~ '\mplan (cx|del contratista|v3)\M' then 'PV3' end,
  case when norm ~ '\mplan de comisionamiento (de )?anin\M' then 'PCX' end,
  case when norm ~ '\m(glosario|que significa|que quiere decir|significado|sigla|siglas|acronimo)\M' then 'GLO' end], null);
 q_and := websearch_to_tsquery(cfg, p_query);
 select string_agg(quote_literal(l.lex),' | ')::tsquery into q_or from (
  select unnest(tsvector_to_array(to_tsvector(cfg, p_query))) as lex union select jsonb_object_keys(exp_w)
 ) l
 where l.lex not in (select unnest(tsvector_to_array(to_tsvector(cfg,
   'debe deben deberia hacer hace hacen hago realiza realizan realizar usar usa usan utilizar utiliza utilizan necesito necesita necesitan requiere requieren cual cuales tiene tienen puede pueden segun favor dime explica explicame indicar indica indique quiero saber sobre caso tipo anexo desarrolla desarrollan desarrollar consiste consisten comprende comprenden contempla contemplan considera consideran significa'))));
 select array_agg(distinct upper(m[1])) into codes from regexp_matches(p_query, '\m((?:EL|SA|CI|ME|TI|EQ)-\d{2})\M', 'gi') as m;
 if q_or is null and codes is null then return; end if;
 select count(*) into n_total from cx_private.kb_chunks;
 return query
 with base as (
  select distinct l as lex from unnest(tsvector_to_array(to_tsvector(cfg, p_query))) l
 ), lx as (
  select l.lex, (select count(*) from cx_private.kb_chunks k where k.tsv @@ quote_literal(l.lex)::tsquery) as df,
         case when exists (select 1 from base b where b.lex = l.lex) then 1.0 else coalesce((exp_w->>l.lex)::numeric, 0.45) end as fw
  from (select distinct unnest(string_to_array(regexp_replace(coalesce(q_or::text,''), '[\s'']', '', 'g'), '|')) as lex) l
  where l.lex <> ''
 ), w as (
  select lx.lex, ln((n_total + 1.0) / (lx.df + 0.5)) * lx.fw as idf from lx where lx.df > 0
 ), cand as (
  select c.id, c.doc, c.tsv, c.systems, c.specialties, length(c.body) as blen from cx_private.kb_chunks c
  where ((q_or is not null and c.tsv @@ q_or) or (codes is not null and c.systems && codes))
    and (p_docs is null or c.doc = any(p_docs))
 ), scored as (
  select cand.id,
         coalesce((select sum(w.idf * (case when cand.tsv @@ (quote_literal(w.lex)||':A')::tsquery then 2.4 else 1.0 end))
                   from w where cand.tsv @@ quote_literal(w.lex)::tsquery), 0)
           / greatest((select sum(w.idf) from w), 1)
           * least(1.0, 0.55 + cand.blen / 700.0)
         + coalesce(ts_rank(cand.tsv, q_or, 1), 0) * 0.5
         + case when codes is not null and cand.systems && codes then 0.6 else 0 end
         + case when cardinality(doc_hint) > 0 and cand.doc = any(doc_hint) then 0.5 else 0 end
         + case when cardinality(spec_hint) > 0 and cand.specialties && spec_hint then 0.25 else 0 end
         + case when cardinality(spec_docs) > 0 and cand.doc = any(spec_docs) then 0.15 else 0 end
         + case when cand.doc in ('GUIA','GLO') then 0.12 else 0 end
         + case when q_and is not null and q_and::text <> '' and cand.tsv @@ q_and then 0.15 else 0 end
         + case when p_specialty is not null and p_specialty = any(cand.specialties) then 0.1 else 0 end as sc
  from cand
 ), ranked as (
  select c.id as cid, c.doc as cdoc, d.title as dtitle, d.nature as dnature, d.rank as drank, c.ord as cord, c.sec as csec, c.title as ctitle,
         c.page_from as pf, c.page_to as pt, c.systems as csys, c.body as cbody, s.sc::real as sc
  from scored s join cx_private.kb_chunks c on c.id = s.id join cx_private.kb_docs d on d.code = c.doc
  order by s.sc desc, d.rank, c.doc, c.ord
  limit lim
 )
 select r.cid, r.cdoc, r.dtitle, r.dnature, r.csec, r.ctitle, r.pf, r.pt, r.csys,
        ts_headline(cfg, r.cbody, coalesce(q_or, q_and), 'MaxFragments=2, MinWords=12, MaxWords=30, FragmentDelimiter=" … ", StartSel=«, StopSel=»'),
        r.cbody, r.sc
 from ranked r order by r.sc desc, r.drank, r.cdoc, r.cord;
end $$;

-- Siglas para la pantalla del asistente (miembros activos).
create or replace function public.cx_kb_glossary() returns jsonb
language sql stable security definer set search_path='' as $$
 select case when (cx_private.member()).user_id is null then '[]'::jsonb else
  coalesce((select jsonb_agg(jsonb_build_object('sec', c.sec, 'title', c.title, 'body', c.body) order by c.ord) from cx_private.kb_chunks c where c.doc = 'GLO'), '[]'::jsonb) end
$$;
revoke execute on function public.cx_kb_glossary() from public, anon;
grant execute on function public.cx_kb_glossary() to authenticated;

commit;
