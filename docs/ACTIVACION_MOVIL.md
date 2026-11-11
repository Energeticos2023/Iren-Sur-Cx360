# Activación de IREN Sur CX360

Sitio: **https://energeticos2023.github.io/Iren-Sur-Cx360/** (GitHub Pages). Anterior: https://iren-sur-cx360.energ-ticos-7536.chatgpt.site (ChatGPT Sites, privado).

## Pasos vigentes (v2.1)

1. GitHub → Settings → General → Change visibility → Public. Luego Settings → Pages → Deploy from a branch → `gh-pages` / root.
2. Supabase → Authentication → URL Configuration: Site URL `https://energeticos2023.github.io/Iren-Sur-Cx360/` y la misma en Redirect URLs.
3. Supabase → Authentication → Users → Add user: `jose.zena.p@uni.pe`, contraseña elegida por el titular, *Auto Confirm User*. Evita depender del SMTP incorporado.
4. Abrir el sitio, ingresar, Administración → Configurar/verificar MFA.
5. Plan Cx → **Cargar catálogo en CX360** (268 registros provisionales del Plan Cx C01 V3).

Lo que sigue es la guía de v2 (ChatGPT Sites); se conserva como antecedente.


## Configuración que el titular decidió realizar personalmente

1. Abrir https://supabase.com/dashboard/project/azajuquqksrjyfbtcujq/auth/url-configuration.
2. En Authentication → URL Configuration, fijar Site URL: https://iren-sur-cx360.energ-ticos-7536.chatgpt.site.
3. Agregar en Redirect URLs ambas variantes exactas: https://iren-sur-cx360.energ-ticos-7536.chatgpt.site y https://iren-sur-cx360.energ-ticos-7536.chatgpt.site/. No usar comodines generales ni cambiar otros proyectos.
4. Comprobar proveedor de correo antes de activar/invitar. SMTP incorporado de Supabase restringe destinatarios y frecuencia; para destinatarios fuera del equipo puede requerirse SMTP propio. No se contrató proveedor ni se probó entrega a jose.zena.p@uni.pe.
5. Abrir CX360 con la cuenta ChatGPT propietaria del sitio. Expandir Primera activación del administrador, elegir personalmente una contraseña de al menos 12 caracteres y confirmar el mensaje recibido en jose.zena.p@uni.pe. Si SMTP rechaza el envío, detener los reintentos y configurar correo. Alternativamente, el propietario puede provisionar su usuario desde Auth → Users → Add user, con su correo y contraseña elegida localmente; no compartir contraseñas en chats/código.
6. Ingresar a CX360 con ese correo confirmado. Administrar → Configurar/verificar MFA: vincular autenticador y comprobar seis dígitos.
7. Crear un registro de ensayo claramente sintético, recargar, comprobar historial y revocarlo. Verificar el celular real antes de campo. No inventar resultados técnicos para probar la interfaz.

Referencias oficiales: [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp). Instrucciones preparadas; no se afirma haber guardado esta configuración en el dashboard.

## Celular

Abrir la URL en Chrome/Android o Safari/iPhone con internet y la cuenta autorizada. Agregar a pantalla de inicio mediante el menú del navegador si está disponible. Chrome se probó a varios anchos; no se certificaron Safari ni dispositivos físicos.

Los módulos están en una barra horizontal superior; deslizarla para ver todos. Actualizar vuelve a consultar permisos/datos. Un fallo no conserva indicadores anteriores. No hay captura offline.

## Fuentes, cronograma y revisión

Registrar la referencia institucional de custodia mediante MFA antes de adjuntar documentos reales. El plan y cronograma entregados permanecen locales en revisión.

El importador entrega plantilla CSV y admite XLSX/JSON. Columnas: code,title,specialty,stage,system_code,equipment_tag,responsible,planned_start,planned_finish,predecessors. Fechas ISO, IDs como texto, predecesoras separadas por | y calendario explícito. No inventar información para superar validaciones ni sumar filas resumen y actividades.

Guardar primero BORRADOR. Aceptación requiere archivo exacto, autoridad, fecha y referencia oficial, más revisión independiente. Solo GP registra vigencia. Propuestas no sustituyen fechas originales; hechos reales quedan aparte.

## Accesos adicionales

No hay profesionales precargados. Tras recibir la nómina, el administrador podrá ingresar nombre, organización, rol y disciplina, verificar MFA y confirmar cada envío. Módulo habilitado; no se enviaron correos durante desarrollo. El sitio continúa privado para el propietario; cada visitante adicional necesita también autorización en Sites. No hacerlo público para resolver acceso.

## Puesta en uso de campo

Completar activación/recuperación/MFA, E2E con profesionales independientes, dispositivos físicos, custodia, respaldo/restauración integral, revisión técnica y aceptación del piloto. El JSON de consulta no incluye archivos ni sustituye respaldo integral de Supabase/Storage. Mantener originales en repositorio institucional autorizado.
