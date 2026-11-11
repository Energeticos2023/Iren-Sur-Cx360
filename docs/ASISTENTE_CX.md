# Asistente Cx — consulta técnica del comisionamiento

Pantalla **Asistente Cx** (pestaña y botón flotante rojo «?»). Permite a los especialistas preguntar sobre el comisionamiento de la Infraestructura Temporal de Contingencia: alcance de cada sistema, pruebas por nivel (L1 a L5), procedimientos, criterios de aceptación, equipos de medición, herramientas, EPP, protocolos, testificación y avisos, capacitación y Manual de OyM.

## Cómo responde

1. La pregunta se busca en la base documental privada (búsqueda en español, sin tildes ni mayúsculas, con sinónimos de siglas como GE, TTA, MT, EPP, DACI, OyM, PETAR).
2. Se toman los 10 fragmentos más pertinentes, cada uno con documento, numeral y página.
3. **Modo IA con citas** (si está configurada la clave): Claude redacta la respuesta solo con esos fragmentos y cita cada afirmación como [F1], [F2]… Al tocar la cita se abre la fuente; «Ver fragmento completo» muestra el texto original.
4. **Modo documental** (sin clave, o si la IA no responde): se muestran directamente los fragmentos más pertinentes con el texto resaltado.

Reglas del asistente: no inventa valores, fechas ni resultados; respeta la jerarquía contrato y Alcance → Anexos 12 y 16 → Plan de Comisionamiento ANIN y Anexos 1 a 5 → Plan Cx C01 V3 del Contratista (borrador no emitido, marcado como tal); muestra discrepancias sin resolverlas; distingue al Contratista (ejecuta), a la Supervisión (verifica, presencia y acepta) y al Gerente de Proyecto (decide).

## Base documental (privada)

| Código | Documento | Fragmentos |
|---|---|---|
| A12 | Anexo 12 – Guías sobre Pruebas y Puesta en Marcha | 54 |
| A16 | Anexo 16 – Manual de Operación y Mantenimiento | 113 |
| PCX | Plan de Comisionamiento ANIN | 56 |
| AN1 a AN5 | Anexos 1 a 5 (eléctricas, sanitarias, mecánicas, TIC, equipamiento médico), incluidos sus formatos | 437 |
| PV3 | Plan Cx C01 V3 del Contratista (borrador): capítulos clave, fichas, protocolos, testificación, hitos, decisiones, riesgos, inconsistencias y criterios por precisar | 210 |

Los textos se guardan en `cx_private.kb_docs` y `cx_private.kb_chunks`, que la API no expone. Solo los miembros activos consultan, mediante `cx_kb_search` (SECURITY DEFINER). El generador (`private/kb/build_kb.py`) y los textos extraídos viven en `private/`, que Git ignora: **el repositorio público no contiene el contenido de los documentos**.

## Control de uso

- Cuota por persona y día (hora de Lima), 80 por defecto; el administrador la cambia o deshabilita el asistente en **Administración → Asistente Cx**.
- Cada consulta queda en `cx_private.assistant_log` (pregunta, modo, fragmentos usados, tokens), no expuesta por la API.
- La conversación se guarda solo en la pestaña del navegador (sessionStorage) y se borra al cerrar sesión o la pestaña.

## Activar el modo IA (titular)

El modo IA necesita una clave de la API de Anthropic, que se guarda como **secreto de la función** en Supabase, nunca en el repositorio ni en el navegador:

1. Obtener la clave en la consola de Anthropic (cuenta y facturación del titular).
2. En el panel de Supabase del proyecto IREN_Sur_CX360, en los secretos de Edge Functions, crear `ANTHROPIC_API_KEY` con esa clave.
3. Opcional: `CX360_ASISTENTE_MODELO` para cambiar el modelo (por defecto `claude-sonnet-5-5`).
4. Abrir el Asistente Cx: el estado cambia de «Modo documental» a «IA con citas».

Costo orientativo: cada consulta envía unos 10 fragmentos (≈ 4 000 a 6 000 tokens de entrada) y recibe hasta 1 400 tokens. La cuota diaria limita el gasto.

## Componentes

- Migración `supabase/migrations/202611110010_asistente_cx.sql`: configuración de búsqueda `cx_private.cx_es`, tablas privadas, `cx_kb_search`, `cx_kb_status`, `cx_assistant_begin/end/configure`.
- Función Edge `cx360-asistente`: verifica sesión y origen, aplica cuota, busca, llama a la IA con instrucciones fijas y registra el uso. Sin clave responde en modo documental.
- Frontend: `site/assistant-core.cjs` (render seguro de respuestas, citas, historial) y `site/assistant-ui.js` (pantalla). Pruebas: `tests/assistant-core.test.cjs` y `tests/browser-assistant.cjs`.

## Límites

- La búsqueda es léxica (palabras y sinónimos); conviene usar los términos del documento (sistema, equipo, prueba, numeral). Si no aparece lo buscado, reformular o filtrar por disciplina.
- El Plan Cx V3 es un borrador del Contratista: lo que cite de él es configuración de trabajo, no requisito aceptado.
- Las respuestas orientan; no sustituyen el documento fuente, la revisión del especialista ni la decisión del Gerente de Proyecto.
