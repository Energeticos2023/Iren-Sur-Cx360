-- SOLO para ejecutar MANUALMENTE en el SQL Editor Supabase ANIN, tras crear el primer usuario en Authentication > Users.
-- Reemplazar UUID y datos solo en el proyecto ANIN independiente.
-- NUNCA colocar esto en la aplicación, en el navegador ni en un repositorio con datos personales.
insert into public.cx_members (user_id,email,full_name,role,active)
values ('REEMPLAZAR-UUID-AUTH','REEMPLAZAR-CORREO','Coordinador ANIN','admin',true)
on conflict(user_id) do nothing;
