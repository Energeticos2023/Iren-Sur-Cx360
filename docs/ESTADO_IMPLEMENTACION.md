# CX360 v2 — Estado verificado, 11/11/2026

Versión de piloto privado para activación y validación de usuarios. No equivale a aceptación para operación de campo. Continúa desde 247a199cd1dca62684028741ffad6f4edcfd7b3a; conserva frontend y esquema originales como antecedentes, sin ejecutarlos.

## Implementado

- Aplicación móvil: actividades, sistemas, cronogramas, documentos, protocolos, pruebas, restricciones, instrumentos, O&M, capacitación, entrega, reprogramaciones, cobertura e historial.
- Supabase exclusivo IREN_Sur_CX360 (azajuquqksrjyfbtcujq), organización Energeticos, sa-east-1. Costo cotizado US$ 0/mes y aceptado explícitamente. Sin cambios en las bases comerciales.
- RLS por disciplina y asignación. Escrituras por funciones de servidor con identidad, rol y control de versión; auditoría no editable por cliente.
- Las funciones SECURITY DEFINER públicas son deliberadas: permisos mínimos, search_path vacío y validaciones de servidor. El asesor de seguridad las señala como advertencias; no se ocultan ni se afirma certificación de seguridad.
- Protocolos publicados inmutables y ligados a documento aceptado. Al ejecutar/revisar una prueba se revalida la fuente; la revocación bloquea nuevas ejecuciones.
- Mediciones por protocolo, unidades y resultados explícitos, instrumentos vigentes, SSOMA, liberaciones, fecha real y alcance provisional/definitivo. Revisión independiente obligatoria; el revisor no cambia las mediciones que cierra.
- Importación CSV/XLSX/JSON validada en revisión: IDs, calendario, zona, fechas, disciplinas, etapas, responsables, sistema/TAG, referencias y ciclos. Cronograma y actividades se guardan atómicamente. Línea base original, vigencia formal, propuestas y fechas reales permanecen separadas.
- Cobertura de requisitos por actividad con entregables vinculados y revisión independiente. El porcentaje requiere universo aceptado y vigencia formal; no cuenta pruebas aisladas ni duplica coberturas. Muestra numerador, denominador, revisión y corte.
- Evidencias PDF/JPG/PNG privadas (20 MB), tipo comprobado por contenido, SHA-256 de servidor y registro atómico. Integridad comprobada al descargar; cliente sin permiso para falsificar metadatos.
- Custodia con referencia institucional y MFA del administrador. Bootstrap administrativo solo para el correo designado confirmado, sin asumir cuenta provisionada.
- Invitaciones nominativas con MFA y confirmación por envío. El despliegue fue autorizado expresamente después del rechazo inicial de revisión automática. No se enviaron invitaciones. Revocación nominativa con historial.
- Reportes CSV/XLSX e impresión/guardar PDF mediante navegador. Respaldo de consulta JSON con hash y verificación; no incluye archivos ni recuperación integral.
- Dependencias fijadas, lockfile y compilación local. PWA de interfaz; sin captura ni sincronización offline.

## Probado

- 21 pruebas locales de frontend/control: consulta fallida sin falsos ceros ni datos anteriores, filtros, HTML, fechas Lima, CSV, validación y cálculo por revisión vigente.
- 21 casos reales de base: anonimato, especialidad ajena, escritura asignada, suplantación, roles, revocación, auditoría, autoaprobación, fechas de origen y rechazo atómico de importación inválida.
- 8 casos reales adicionales: ejecución→revisión→cierre independiente, mediciones inmutables, línea base/vigencia, cobertura y custodia con MFA.
- Pruebas SQL revertidas al terminar. Consulta posterior: cero miembros, cero registros y cero archivos; custodia no autorizada. No se crearon integrantes operativos ficticios.
- Chrome real con API simulada, anchos 360/390/430/1440: módulos, creación RPC, importación, XLSX y recuperación de error. No es E2E con usuarios reales ni certificación Safari o dispositivos físicos.
- npm audit: cero vulnerabilidades informadas en dependencias de producción al corte.

## Despliegue y activación

Proyecto Sites privado: appgprj_6af47d05319c8191b8a7d4da5e4be045. Destino: https://iren-sur-cx360.energ-ticos-7536.chatgpt.site.
La URL reservada no prueba publicación: consultar el resultado nativo y su versión/SHA. Las funciones cx360-upload y cx360-invite están desplegadas. El resultado final de publicación se conserva en private/continuidad_v2.json al terminar.

El usuario decidió configurar personalmente las URL de Auth. Ver ACTIVACION_MOVIL.md. No se comprobó entrega de correo ni se creó contraseña o cuenta administradora autenticada.

## Pendientes antes de operación de campo

- Plan y cronograma PDF accesibles, extraídos localmente con hash y revisión visual. Cronograma preparado en private/sources/cronograma_en_revision.json: 78 filas, incluidas 64 subfilas. Fechas/IDs conservados; calendario, dependencias, responsables y mapeo pendientes. No se subieron documentos reales a nube/GitHub.
- Evidencia formal de cronograma aceptado y revisión vigente. Firmas/autores del PDF no se convierten en nómina ni aceptación del GP.
- Referencia de autorización institucional de custodia antes de documentos reales; designación administrativa no la sustituye.
- Nómina de ANIN/Supervisión. Invitación Supabase y autorización de visitante Sites son controles distintos. El sitio sigue privado para el propietario.
- Activación real del administrador, entrega de correo, MFA, E2E con ejecutor/revisor, dispositivos físicos, revisión de advertencias de seguridad y aceptación del piloto.
- Respaldo/restauración integral de base y archivos no acreditado; el respaldo de consulta no lo sustituye. No declarar producción terminada mientras esto y la aceptación sigan pendientes.
- No se ejecutaron pruebas de campo, energizaciones, remisiones Aconex/ACC ni decisiones contractuales. No hay ruta crítica o atraso laboral acreditados por una pantalla.

La referencia de continuidad del ZIP de la skill permanece histórica y sin modificar. Expedientes, extracciones y capturas locales están ignorados por Git.
