-- CX360 v2.5: el Asistente Cx responde por sistema y por fase (Precomisionamiento, Pruebas, Puesta en marcha,
-- Manual O&M, Capacitaciones) con fichas breves generadas desde la matriz de alcance privada (cx_private.scope_matrix).
-- Aquí solo estructura y lógica; el contenido sigue fuera de Git y se genera en el servidor con cx_private.build_scope_kb().
begin;

insert into cx_private.kb_docs(code, title, nature, rank)
values ('MAT', 'Matriz CX360 por sistema y fase (síntesis del Alcance ANIN, Plan Cx del Contratista y planos C01, con referencias)', 'guia', 1)
on conflict (code) do update set title = excluded.title, nature = excluded.nature, rank = excluded.rank;

-- Texto corto: compacta los códigos largos de planos y corta en límite de palabra.
create or replace function cx_private.scope_short(p text, n integer) returns text language sql immutable set search_path = '' as $$
 select case when p is null then null else (select case when length(t) <= n then t else regexp_replace(left(t, n), '\s+\S*$', '') || '…' end
  from (select regexp_replace(regexp_replace(trim(p), '100021-JYS01-100-[A-Z0-9]+-PLA-IEL-E5-0000(\d\d)', '\1', 'g'), '\s+', ' ', 'g') as t) x) end
$$;

-- Etiquetas de elementos: «PT-BT-01 a PT-BT-04 (4)».
create or replace function cx_private.scope_tags(p jsonb) returns text language sql immutable set search_path = '' as $$
 select case when n = 0 then null when n <= 2 then (select string_agg(t, ', ') from jsonb_array_elements_text(p) t) else (p->>0) || ' a ' || (p->>(n - 1)) || ' (' || n || ')' end
 from (select case when jsonb_typeof(p) = 'array' then jsonb_array_length(p) else 0 end as n) x
$$;

-- Lista breve de requisitos: «- texto [unidad] (fuente · origen)».
create or replace function cx_private.scope_lines(p jsonb) returns text language sql immutable set search_path = '' as $$
 select coalesce(string_agg('- ' || (x->>'t') || coalesce(' [' || (x->>'unit') || ']', '') ||
   coalesce(' (' || cx_private.scope_short(x->>'s', 48) || case x->>'o' when 'C' then ' · propuesta' when 'D' then ' · diseño C01' else '' end || ')', ''), E'\n' order by n), '')
 from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) with ordinality as e(x, n)
 where coalesce(x->>'t', '') <> ''
$$;

create or replace function cx_private.scope_block(p_name text, p jsonb) returns text language sql immutable set search_path = '' as $$
 select case when cx_private.scope_lines(p) = '' then '' else p_name || E':\n' || cx_private.scope_lines(p) || E'\n' end
$$;

-- Regenera las fichas MAT a partir de la matriz. Idempotente.
create or replace function cx_private.build_scope_kb() returns integer language plpgsql security definer set search_path = '' as $$
declare r record; d jsonb; comps text; compsl text; crit text; pend text; protos jsonb; n integer := 0; ph record; body text; ttl text; sys text[]; specs text[];
begin
 delete from cx_private.kb_chunks where doc = 'MAT';
 for r in select code, specialty, ord, data from cx_private.scope_matrix order by ord, code loop
  if r.code = '_common' then d := r.data->'common'; else d := r.data; end if;
  sys := case when r.code = '_common' then '{}'::text[] else array[r.code] end;
  specs := case when r.code = '_common' then array['IIEE','IISS','IIMM','TIC','EM'] else array[r.specialty] end;
  ttl := case when r.code = '_common' then 'Todos los sistemas' else r.code || ' ' || coalesce(d->>'title', '') end;
  comps := coalesce((select string_agg('- ' || (c->>'g') || coalesce(': ' || coalesce(cx_private.scope_tags(c->'tags'), nullif(c->>'n', '—')), '') ||
     case when coalesce(c->>'k', '—') <> '—' then ' → ' || cx_private.scope_short(c->>'k', 90) else '' end, E'\n' order by i)
   from jsonb_array_elements(case when jsonb_typeof(d->'componentes') = 'array' then d->'componentes' else '[]'::jsonb end) with ordinality as x(c, i) where coalesce(c->>'k', '—') <> '—' or jsonb_typeof(c->'tags') = 'array'), '');
  compsl := coalesce((select string_agg('- ' || (c->>'g') || coalesce(': ' || coalesce(cx_private.scope_tags(c->'tags'), nullif(c->>'n', '—')), '') ||
     case when coalesce(c->>'k', '—') <> '—' then '; se conecta a: ' || cx_private.scope_short(c->>'k', 120) else '' end ||
     case when coalesce(c->>'u', '—') <> '—' then '; ubicación: ' || cx_private.scope_short(c->>'u', 90) else '' end ||
     case when coalesce(c->>'s', '') <> '' then ' (' || cx_private.scope_short(c->>'s', 60) || ')' else '' end, E'\n' order by i)
   from jsonb_array_elements(case when jsonb_typeof(d->'componentes') = 'array' then d->'componentes' else '[]'::jsonb end) with ordinality as x(c, i)), '');
  crit := coalesce((select string_agg('- ' || (c->>'g') || coalesce(' (' || cx_private.scope_tags(c->'tags') || ')', '') || ': ' || (c->>'crit'), E'\n' order by i)
   from jsonb_array_elements(case when jsonb_typeof(d->'componentes') = 'array' then d->'componentes' else '[]'::jsonb end) with ordinality as x(c, i) where coalesce(c->>'crit', '') <> ''), '');
  pend := coalesce((select string_agg(t, '; ') from jsonb_array_elements_text(case when jsonb_typeof(d->'pendientes') = 'array' then d->'pendientes' else '[]'::jsonb end) t), '');
  protos := coalesce(d->'protocolos', '{}'::jsonb);
  for ph in select * from (values
    ('PRE', 'Precomisionamiento', 1), ('PRU', 'Pruebas', 2), ('PEM', 'Puesta en marcha', 3), ('OYM', 'Manual O&M', 4), ('CAP', 'Capacitaciones', 5), ('ID', 'Qué se interviene', 6)) v(sec, label, o) loop
   body := case ph.sec
    when 'PRE' then 'Precomisionamiento de ' || ttl || E' (sin energía: revisión documental y verificación física contra planos).\n'
      || case when comps <> '' then E'Qué se interviene:\n' || comps || E'\n' else '' end
      || cx_private.scope_block('Revisión documental', d#>'{pre,documental}') || cx_private.scope_block('Verificación física (según plano)', d#>'{pre,fisica}')
      || cx_private.scope_block('Para pasar a pruebas', d#>'{pre,liberacion}')
      || coalesce('Protocolos: ' || nullif((select string_agg(t, ', ') from jsonb_array_elements_text(coalesce(protos->'pre', '[]')) t where t ~* '^PC-'), '') || E'\n', '')
      || case when pend <> '' then 'Por confirmar: ' || pend else '' end
    when 'PRU' then 'Pruebas de ' || ttl || E' (mediciones con instrumento calibrado y criterio con fuente).\n'
      || cx_private.scope_block('Sin tensión', d#>'{pre,estaticas}') || cx_private.scope_block('Con energía (arranque y funcionales)', d->'cx')
      || cx_private.scope_block('Instrumentos', d->'instr')
      || case when crit <> '' then E'Criterio por subsistema:\n' || crit || E'\n' else '' end
      || coalesce('Protocolos: ' || nullif(concat_ws(', ', (select string_agg(t, ', ') from jsonb_array_elements_text(coalesce(protos->'pre', '[]')) t where t !~* '^PC-'), (select string_agg(t, ', ') from jsonb_array_elements_text(coalesce(protos->'cx', '[]')) t)), '') || E'\n', '')
      || case when pend <> '' then 'Por confirmar: ' || pend else '' end
    when 'PEM' then 'Puesta en marcha de ' || ttl || E' (conectado, con carga real y funcionando; interfaces).\n'
      || cx_private.scope_block('En operación', d->'pem')
      || coalesce('Interfaces: ' || nullif((select string_agg(t, '; ') from jsonb_array_elements_text(case when jsonb_typeof(d->'interfaces') = 'array' then d->'interfaces' else '[]'::jsonb end) t), '') || E'\n', '')
      || coalesce('Protocolos: ' || nullif((select string_agg(t, ', ') from jsonb_array_elements_text(coalesce(protos->'pem', '[]')) t), ''), '')
    when 'OYM' then 'Manual de OyM de ' || ttl || E' (Anexo 16) y entrega.\n'
      || cx_private.scope_block('Contenido del Manual de OyM', d->'om') || cx_private.scope_block('Entrega (dossier)', d->'ent')
    when 'CAP' then 'Capacitaciones de ' || ttl || E' (después de las pruebas satisfactorias).\n'
      || cx_private.scope_block('Capacitación', d->'cap')
    else case when r.code = '_common' then null else 'Qué se interviene en ' || ttl || E'.\n' || coalesce(nullif(d->>'resumen', '') || E'\n', '')
      || case when compsl <> '' then E'Componentes:\n' || compsl || E'\n' else '' end
      || coalesce('Interfaces: ' || nullif((select string_agg(t, '; ') from jsonb_array_elements_text(case when jsonb_typeof(d->'interfaces') = 'array' then d->'interfaces' else '[]'::jsonb end) t), '') || E'\n', '')
      || case when pend <> '' then 'Por confirmar: ' || pend else '' end end
   end;
   if body is null or length(regexp_replace(body, '^[^\n]*\n?', '')) < 8 then continue; end if;
   insert into cx_private.kb_chunks(id, doc, ord, sec, title, page_from, page_to, systems, specialties, body)
   values ('MAT-' || r.code || '-' || ph.sec, 'MAT', coalesce(r.ord, 0) * 10 + ph.o, ph.sec, ttl || ' – ' || ph.label, null, null, sys, specs, trim(body));
   n := n + 1;
  end loop;
 end loop;
 update cx_private.kb_docs set loaded_at = now() where code = 'MAT';
 return n;
end $$;
revoke all on function cx_private.build_scope_kb(), cx_private.scope_lines(jsonb), cx_private.scope_block(text, jsonb), cx_private.scope_short(text, integer), cx_private.scope_tags(jsonb) from public, anon, authenticated;

-- Términos que identifican un sistema eléctrico aunque la pregunta no traiga su código (expresión sobre texto en minúsculas y sin tildes).
create table if not exists cx_private.kb_system_terms (term text primary key, codes text[] not null);
revoke all on table cx_private.kb_system_terms from public, anon, authenticated;
insert into cx_private.kb_system_terms(term, codes) values
 ('pozos? (a|de) tierra|puesta a tierra|pararrayos?|spda|equipotencial\w*|telurometro|malla (a|de) tierra|tierra electrica', '{EL-01}'),
 ('media tension|subestacion( electrica)?|celdas?( de mt)?|transformador de potencia|pmi', '{EL-02}'),
 ('grupos? electrogenos?|ge|tta|transferencia automatica|banco resistivo', '{EL-03}'),
 ('tableros?( electricos?)?( de baja tension)?|alimentadores?|itm|interruptores? diferenciales?', '{EL-04}'),
 ('sai|ups|transformador(es)? de aislamiento|sistema it|monitor(es)? de aislamiento', '{EL-05}'),
 ('alumbrado|iluminacion|luminarias?|tomacorrientes?|mecanismos( electricos)?|luxometro|lux', '{EL-06}'),
 ('selectividad|coordinacion de protecciones|caida de tension', '{EL-07}')
on conflict (term) do update set codes = excluded.codes;

insert into cx_private.kb_synonyms(term, expansion, weight) values
 ('pruebas?|ensayos?|mediciones?', 'pruebas medicion criterio instrumento', 0.45),
 ('manual|mantenimiento', 'manual operacion mantenimiento oym', 0.45),
 ('capacitaciones?|capacitar', 'capacitacion entrenamiento', 0.6)
on conflict do nothing;

create or replace function public.cx_kb_search(p_query text, p_limit integer default 8, p_specialty text default null, p_docs text[] default null)
 returns table(id text, doc text, doc_title text, nature text, sec text, title text, page_from integer, page_to integer, systems text[], snippet text, body text, score real)
 language plpgsql stable security definer set search_path to '' as $function$
#variable_conflict use_column
declare
 cfg constant regconfig := 'cx_private.cx_es'::regconfig;
 q_and tsquery; q_or tsquery; codes text[]; tcodes text[]; phase text; nomat boolean; norm text; n_total integer; exp_w jsonb; doc_hint text[]; spec_hint text[]; spec_docs text[];
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
 -- Sistema nombrado por sus palabras (pozos a tierra, alumbrado, grupo electrógeno…) y fase preguntada.
 select array_agg(distinct c) into tcodes from cx_private.kb_system_terms t, unnest(t.codes) c where norm ~ ('\m(' || t.term || ')\M');
 phase := case
  when norm ~ '\mpre-? ?comisionamiento\M' then 'PRE'
  when norm ~ '\m(capacitaciones?|capacitar|entrenamiento)\M' then 'CAP'
  when norm ~ '\m(manual\w*|o&m|oym|operacion y mantenimiento|mantenimiento)\M' then 'OYM'
  when norm ~ '\m(puesta en marcha|puesta en servicio|operacion continua|pruebas? integradas?)\M' then 'PEM'
  when norm ~ '\m(pruebas?|ensayos?|medicion\w*|medir|mide|comisionamiento|criterios?|instrumentos?|continuidad|aislamiento|resistencia)\M' then 'PRU'
  when norm ~ '\m(identific\w*|inventario|componentes?|cuant[oa]s?|a que se conecta\w*|que (pozos|circuitos|tableros|equipos) hay)\M' then 'ID'
  else null end;
 -- Preguntas de seguridad, EPP o herramientas sin fase: priorizar los documentos originales y la guía.
 nomat := phase is null and norm ~ '\m(epp|epc|proteccion personal|herramientas?|seguridad|ssoma|petar|ats|iperc|bloqueo|riesgos?)\M';
 q_and := websearch_to_tsquery(cfg, p_query);
 select string_agg(quote_literal(l.lex),' | ')::tsquery into q_or from (
  select unnest(tsvector_to_array(to_tsvector(cfg, p_query))) as lex union select jsonb_object_keys(exp_w)
 ) l
 where l.lex not in (select unnest(tsvector_to_array(to_tsvector(cfg,
   'debe deben deberia hacer hace hacen hago realiza realizan realizar usar usa usan utilizar utiliza utilizan necesito necesita necesitan requiere requieren cual cuales tiene tienen puede pueden segun favor dime explica explicame indicar indica indique quiero saber sobre caso tipo anexo desarrolla desarrollan desarrollar consiste consisten comprende comprenden contempla contemplan considera consideran significa corresponde corresponden'))));
 select array_agg(distinct upper(m[1])) into codes from regexp_matches(p_query, '\m((?:EL|SA|CI|ME|TI|EQ)-\d{2})\M', 'gi') as m;
 if q_or is null and codes is null and tcodes is null then return; end if;
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
  select c.id, c.doc, c.sec, c.tsv, c.systems, c.specialties, length(c.body) as blen from cx_private.kb_chunks c
  where ((q_or is not null and c.tsv @@ q_or) or (codes is not null and c.systems && codes) or (tcodes is not null and c.doc = 'MAT' and c.systems && tcodes))
    and (p_docs is null or c.doc = any(p_docs))
 ), scored as (
  select cand.id,
         coalesce((select sum(w.idf * (case when cand.tsv @@ (quote_literal(w.lex)||':A')::tsquery then 2.4 else 1.0 end))
                   from w where cand.tsv @@ quote_literal(w.lex)::tsquery), 0)
           / greatest((select sum(w.idf) from w), 1)
           * least(1.0, 0.55 + cand.blen / 700.0)
         + coalesce(ts_rank(cand.tsv, q_or, 1), 0) * 0.5
         + case when codes is not null and cand.systems && codes then 0.6 else 0 end
         + case when tcodes is not null and cand.systems && tcodes then (case when cand.doc = 'MAT' then (case when phase is not null then 0.5 else 0.25 end) else 0.15 end) else 0 end
         + case when cand.doc = 'MAT' and phase is not null and cand.sec = phase then 0.6 else 0 end
         + case when cand.doc = 'MAT' and phase is null and cand.sec = 'ID' then 0.1 else 0 end
         + case when nomat and cand.doc = 'MAT' then -0.6 else 0 end
         + case when cardinality(doc_hint) > 0 and cand.doc = any(doc_hint) then 0.5 else 0 end
         + case when cardinality(spec_hint) > 0 and cand.specialties && spec_hint then 0.25 else 0 end
         + case when cardinality(spec_docs) > 0 and cand.doc = any(spec_docs) then 0.15 else 0 end
         + case when cand.doc in ('GUIA','GLO','MAT') then 0.12 else 0 end
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
end $function$;

commit;
