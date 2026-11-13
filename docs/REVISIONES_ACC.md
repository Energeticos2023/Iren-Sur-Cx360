# Registro de revisiones Autodesk ACC en CX360

**Objeto:** trazabilidad del Hospital de Contingencia IREN Sur. **No confundir:** procedimiento/documento revisado, estado del flujo ACC, código de estado documental, comentarios u opiniones de especialistas, incidencias ACC, respuesta/subsanación, decisión final y liberación operativa de pruebas.

## Fuentes y jerarquía
- Autodesk ACC conserva la revisión/documento, versiones, opiniones, incidencias y decisión emitidas. Aconex conserva comunicaciones oficiales y actos que correspondan a ese canal.
- CX360 es un registro de consulta interna, manual y con fecha de corte; no emite ni acepta documentos en ACC/Aconex, no modifica el Alcance, no certifica cierres, ni libera energización.
- No asumir que la etiqueta S4 sea aprobación. La revisión puede estar abierta o devuelta y una opinión favorable individual no equivale a decisión final.
- No suponer que un registro interno de revisión, de un comentario, o de verificación de fuente demuestra cumplimiento de pruebas físicas. Para liberar ensayos se requieren todos los prerrequisitos y la competencia documentados.
- Mantener expedientes de Hospital Definitivo separados. Registrar solo Contingencia.

## Flujo de captura
1. **Nueva revisión:** ID ACC real, documento/código completo, revisión C01, versión de archivo si aparece, título, especialidad, sistema, etapa, código de estado, estado del flujo y paso actual.
2. **Fuente y corte:** fecha de consulta, enlace oficial HTTPS si existe, referencia a evidencia institucional, vencimiento declarado por ACC. No confundir fecha de captura con fecha de actuación.
3. **Actuaciones individuales:** por cada especialista registrar opinión, fecha, autor identificado en ACC, texto/síntesis fiel, incidencia/observación, requisito y acción requerida; agregar respuestas de contratista y subsanaciones como registros posteriores. **La bitácora no permite editar actos anteriores**; rectificar agregando un nuevo evento.
4. **Decisión final:** un único dictamen por revisión solo cuando la fuente oficial lo evidencie; guardar referencia y fecha. Una condición o comentario no satisfecha permanece pendiente.
5. **Vínculo Aconex:** registrar su código exacto y contrastar versiones, instrucciones y eventuales comunicaciones formalizadas por el GP, sin duplicar el expediente.
6. **Cotejo independiente:** administrador o GP autorizado, distinto del creador, con MFA AAL2 y referencia+URL oficial comprueban la correspondencia de la ficha y la fuente ACC; esto solo marca «fuente cotejada», **no** «aceptación técnica» ni «protocolo liberado».
7. **Cruce con Cx:** el sistema/TAG y etapa permiten encontrar los procedimientos y pruebas afectados; la ficha ACC por sí sola **no altera** permisos, bloqueos o estado de pruebas. Vincular el procedimiento aceptado y requisitos en el registro de pruebas por el flujo formal existente.

## Ejemplo de calibración: ACC #2641, 13/11/2026
La captura proporcionada muestra la revisión #2641, documento de procedimiento de detección y alarma de incendio, revisión C01, versión V1, estado del flujo «ABIERTO» y código documental «S4». En los comentarios, una opinión IIEE favorable condicionada al levantamiento de observaciones y otras especialidades. **No documenta aceptación integral ni cierre operativo.** No insertar automáticamente esta captura en una base privada hasta acreditar autorización institucional de custodia.

## Seguridad
- Proyecto Supabase exclusivo IREN_Sur_CX360, no los repositorios comerciales.
- RLS para miembros activos; registros con autor de la sesión; expediente+revisión único; auditoría append-only de cambios y actuaciones.
- Miembros con rol auditor solo leen; especialistas escriben en su especialidad; coordinación puede gestionar interdisciplinariamente. Verificación por admin/GP diferente del autor con MFA.
- Archivos originales de ACC permanecen en su repositorio oficial. CX360 almacena referencias, no contenido contractual en GitHub público.
- Estado de despliegue debe separarse de código, base y navegador. Sin pruebas E2E e identidad institucional, **piloto**.

## Próximas ampliaciones
- Conector ACC por API oficial solo después de permisos institucionales expresos y prueba de lectura de versiones, revisiones, incidencias y respuestas. Hasta entonces registro manual.
- Integración bidireccional de referencias ACC↔Aconex↔procedimiento/protocolo en la biblioteca y pruebas (sin convertir una decisión documental en liberación).
- Filtros por sistema, etapa, respuesta pendiente, criticidad y plazos oficiales; reportes de pendientes por especialidad.
