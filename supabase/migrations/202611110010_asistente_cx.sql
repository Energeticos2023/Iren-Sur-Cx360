-- CX360 v2.2: Asistente Cx. Base de conocimiento documental privada + búsqueda en español + cuota y bitácora.
-- El contenido documental se carga aparte en cx_private (no expuesto por la API) y NO se versiona en Git.
begin;

create extension if not exists unaccent with schema extensions;

do $$ begin
 if not exists (select 1 from pg_ts_config c join pg_namespace n on n.oid=c.cfgnamespace where n.nspname='cx_private' and c.cfgname='cx_es') then
  create text search configuration cx_private.cx_es (copy = pg_catalog.spanish);
  alter text search configuration cx_private.cx_es
   alter mapping for hword, hword_part, word with extensions.unaccent, pg_catalog.spanish_stem;
 end if;
end $$;

create table if not exists cx_private.kb_docs (
 code text primary key,
 title text not null,
 nature text not null check (nature in ('contractual','cliente','propuesta')),
 rank integer not null,
 loaded_at timestamptz not null default now()
);

create table if not exists cx_private.kb_chunks (
 id text primary key,
 doc text not null references cx_private.kb_docs(code) on delete cascade,
 ord integer not null,
 sec text,
 title text not null,
 page_from integer,
 page_to integer,
 systems text[] not null default '{}',
 specialties text[] not null default '{}',
 body text not null check (length(body) between 1 and 6000),
 tsv tsvector
);
create index if not exists kb_chunks_tsv on cx_private.kb_chunks using gin (tsv);
create index if not exists kb_chunks_systems on cx_private.kb_chunks using gin (systems);
create index if not exists kb_chunks_doc on cx_private.kb_chunks (doc, ord);

create or replace function cx_private.kb_tsv() returns trigger language plpgsql set search_path='' as $$
begin
 new.tsv := setweight(to_tsvector('cx_private.cx_es'::regconfig, coalesce(new.sec,'')||' '||coalesce(new.title,'')||' '||array_to_string(new.systems,' ')),'A')
         || setweight(to_tsvector('cx_private.cx_es'::regconfig, coalesce(new.body,'')),'B');
 return new;
end $$;
drop trigger if exists kb_chunks_tsv on cx_private.kb_chunks;
create trigger kb_chunks_tsv before insert or update on cx_private.kb_chunks for each row execute function cx_private.kb_tsv();

create table if not exists cx_private.assistant_config (
 id boolean primary key default true check (id),
 enabled boolean not null default true,
 daily_limit integer not null default 80 check (daily_limit between 0 and 1000)
);
insert into cx_private.assistant_config(id) values (true) on conflict (id) do nothing;

create table if not exists cx_private.assistant_log (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id),
 asked_at timestamptz not null default now(),
 question text not null,
 mode text,
 chunk_ids text[],
 model text,
 input_tokens integer,
 output_tokens integer,
 ok boolean,
 error text,
 answer_chars integer
);
create index if not exists assistant_log_user_day on cx_private.assistant_log (user_id, asked_at);

revoke all on table cx_private.kb_docs, cx_private.kb_chunks, cx_private.assistant_config, cx_private.assistant_log from public, anon, authenticated;

-- Búsqueda documental: solo miembros activos. Ranking por densidad de coincidencias (OR), bono por coincidencia
-- completa (AND), por código de sistema citado (EL-03, TI-07…) y, levemente, por la disciplina del usuario.
create or replace function public.cx_kb_search(p_query text, p_limit integer default 8, p_specialty text default null, p_docs text[] default null)
returns table (id text, doc text, doc_title text, nature text, sec text, title text, page_from integer, page_to integer,
               systems text[], snippet text, body text, score real)
language plpgsql stable security definer set search_path='' as $$
#variable_conflict use_column
declare
 cfg constant regconfig := 'cx_private.cx_es'::regconfig;
 q_and tsquery; q_or tsquery; codes text[]; norm text; n_total integer; exp_w jsonb; doc_hint text[];
 lim integer := least(greatest(coalesce(p_limit,8),1),15);
begin
 if (cx_private.member()).user_id is null then raise exception 'Consulta reservada a miembros activos de CX360'; end if;
 if p_query is null or length(trim(p_query)) < 3 then return; end if;
 if length(p_query) > 2000 then raise exception 'Consulta demasiado larga'; end if;
 norm := lower(extensions.unaccent('extensions.unaccent'::regdictionary, p_query));
 -- Sinónimos (peso 0.9: siglas equivalentes) y términos relacionados (peso 0.45).
 select coalesce(jsonb_object_agg(x.lex, x.wt), '{}'::jsonb) into exp_w from (
  select l as lex, max(s.wt) as wt
  from (values
   ('epp','equipos proteccion personal',0.9),('epc','equipos proteccion colectiva',0.9),('ge','grupo electrogeno',0.9),('tta','tablero transferencia automatica',0.9),
   ('mt','media tension',0.9),('bt','baja tension',0.9),('ups','sai',0.9),('sai','ups',0.9),('daci','deteccion alarma incendios',0.9),
   ('aci','agua contra incendio',0.9),('hvac','aire acondicionado ventilacion',0.9),('uma','unidad manejadora aire',0.9),
   ('oym','operacion mantenimiento',0.9),('o&m','operacion mantenimiento oym',0.9),('cctv','videovigilancia camaras',0.9),('loto','bloqueo etiquetado',0.9),
   ('petar','permiso escrito trabajo alto riesgo',0.9),('ats','analisis seguro trabajo',0.9),('iperc','identificacion peligros riesgos',0.9),
   ('fat','pruebas fabrica',0.9),('sc3','culminacion seccional',0.9),('ascensor','montacargas transporte vertical',0.9),('montacargas','ascensor transporte vertical',0.9),
   ('oxigeno','manifold gases medicinales',0.45),('megometro','medidor aislamiento',0.9),('telurometro','resistencia puesta tierra',0.9),
   ('hp','prueba presenciada aviso',0.45),('testificacion','prueba presenciada aviso',0.9),('presenciada','testificacion aviso',0.45),
   ('herramientas','instrumentos equipos',0.45),('instrumentos','herramientas medicion calibracion',0.45),('equipos','herramientas instrumentos',0.45),
   ('protocolo de prueba','estructura procedimientos protocolos formato',0.45),('protocolos de prueba','estructura procedimientos protocolos formato',0.45),
   ('alcance','objetivo sistemas',0.45),('capacitacion','entrenamiento formacion',0.45),('pruebas integradas','escenario integradas',0.45)
  ) s(term, exp, wt), unnest(tsvector_to_array(to_tsvector(cfg, s.exp))) l
  where norm ~ ('\m'||s.term||'\M')
  group by l) x;
 -- Documento citado expresamente (Anexo 12, Anexo 16, Anexo 1 a 5, Plan Cx).
 doc_hint := array_remove(array[
  case when norm ~ '\manexo\s*n?[°º.]?\s*12\M' then 'A12' end, case when norm ~ '\manexo\s*n?[°º.]?\s*16\M' then 'A16' end,
  case when norm ~ '\manexo\s*n?[°º.]?\s*0?1\M' then 'AN1' end, case when norm ~ '\manexo\s*n?[°º.]?\s*0?2\M' then 'AN2' end,
  case when norm ~ '\manexo\s*n?[°º.]?\s*0?3\M' then 'AN3' end, case when norm ~ '\manexo\s*n?[°º.]?\s*0?4\M' then 'AN4' end,
  case when norm ~ '\manexo\s*n?[°º.]?\s*0?5\M' then 'AN5' end, case when norm ~ '\mplan (cx|del contratista|v3)\M' then 'PV3' end,
  case when norm ~ '\mplan de comisionamiento (de )?anin\M' then 'PCX' end], null);
 q_and := websearch_to_tsquery(cfg, p_query);
 select string_agg(quote_literal(l.lex),' | ')::tsquery into q_or from (
  select unnest(tsvector_to_array(to_tsvector(cfg, p_query))) as lex union select jsonb_object_keys(exp_w)
 ) l
 where l.lex not in (select unnest(tsvector_to_array(to_tsvector(cfg,
   'debe deben deberia hacer hace hacen hago realiza realizan realizar usar usa usan utilizar utiliza utilizan necesito necesita necesitan requiere requieren cual cuales tiene tienen puede pueden segun favor dime explica explicame indicar indica indique quiero saber sobre caso tipo anexo'))));
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
         + case when doc_hint is not null and cardinality(doc_hint) > 0 and cand.doc = any(doc_hint) then 0.5 else 0 end
         + case when q_and is not null and q_and::text <> '' and cand.tsv @@ q_and then 0.15 else 0 end
         + case when p_specialty is not null and p_specialty = any(cand.specialties) then 0.04 else 0 end as sc
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

-- Estado de la base de conocimiento (para la pantalla del asistente).
create or replace function public.cx_kb_status() returns jsonb
language sql stable security definer set search_path='' as $$
 select case when (cx_private.member()).user_id is null then jsonb_build_object('docs','[]'::jsonb) else
  jsonb_build_object(
   'docs', coalesce((select jsonb_agg(jsonb_build_object('code',d.code,'title',d.title,'nature',d.nature,'chunks',(select count(*) from cx_private.kb_chunks c where c.doc=d.code)) order by d.rank, d.code) from cx_private.kb_docs d),'[]'::jsonb),
   'enabled', (select enabled from cx_private.assistant_config where id),
   'daily_limit', (select daily_limit from cx_private.assistant_config where id),
   'used_today', (select count(*) from cx_private.assistant_log l where l.user_id=auth.uid() and l.asked_at >= (date_trunc('day', now() at time zone 'America/Lima') at time zone 'America/Lima')))
 end
$$;

-- Inicio de consulta: verifica membresía, habilitación y cuota diaria (hora de Lima); registra la pregunta.
create or replace function public.cx_assistant_begin(p_question text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m public.cx_members; used integer; lim integer; on_ boolean; new_id bigint;
begin
 m := cx_private.member();
 if m.user_id is null then raise exception 'Asistente reservado a miembros activos de CX360'; end if;
 if p_question is null or length(trim(p_question)) < 3 or length(p_question) > 1500 then raise exception 'Pregunta vacía o demasiado larga (máximo 1500 caracteres)'; end if;
 select enabled, daily_limit into on_, lim from cx_private.assistant_config where id;
 if not coalesce(on_, true) then raise exception 'Asistente deshabilitado por el administrador'; end if;
 select count(*) into used from cx_private.assistant_log l where l.user_id = m.user_id and l.asked_at >= (date_trunc('day', now() at time zone 'America/Lima') at time zone 'America/Lima');
 if used >= coalesce(lim, 80) then raise exception 'Cuota diaria del asistente agotada (% consultas). Se renueva a medianoche, hora de Lima.', coalesce(lim, 80); end if;
 insert into cx_private.assistant_log(user_id, question) values (m.user_id, left(trim(p_question), 1500)) returning id into new_id;
 return jsonb_build_object('log_id', new_id, 'used', used + 1, 'limit', coalesce(lim, 80), 'role', m.role, 'specialty', m.specialty, 'name', m.full_name);
end $$;

-- Cierre de consulta: solo el autor puede completar su registro, una vez.
create or replace function public.cx_assistant_end(p_log bigint, p_mode text, p_chunks text[], p_model text, p_in integer, p_out integer, p_ok boolean, p_error text, p_answer_chars integer)
returns void language plpgsql security definer set search_path='' as $$
begin
 update cx_private.assistant_log
    set mode = left(p_mode, 20), chunk_ids = p_chunks[1:20], model = left(p_model, 60), input_tokens = p_in, output_tokens = p_out,
        ok = p_ok, error = left(p_error, 500), answer_chars = p_answer_chars
  where id = p_log and user_id = auth.uid() and mode is null;
end $$;

-- Configuración (solo administrador).
create or replace function public.cx_assistant_configure(p_enabled boolean, p_daily_limit integer) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if (cx_private.member()).role is distinct from 'admin' then raise exception 'Configuración reservada al administrador'; end if;
 update cx_private.assistant_config set enabled = coalesce(p_enabled, enabled), daily_limit = coalesce(p_daily_limit, daily_limit) where id;
 return (select jsonb_build_object('enabled', enabled, 'daily_limit', daily_limit) from cx_private.assistant_config where id);
end $$;

revoke execute on function public.cx_kb_search(text,integer,text,text[]), public.cx_kb_status(), public.cx_assistant_begin(text),
 public.cx_assistant_end(bigint,text,text[],text,integer,integer,boolean,text,integer), public.cx_assistant_configure(boolean,integer) from public, anon;
grant execute on function public.cx_kb_search(text,integer,text,text[]), public.cx_kb_status(), public.cx_assistant_begin(text),
 public.cx_assistant_end(bigint,text,text[],text,integer,integer,boolean,text,integer), public.cx_assistant_configure(boolean,integer) to authenticated;

commit;
