# CX360 v2 — Estado verificado, 11/11/2026

Versión de piloto privado para activación y validación de usuarios. No equivale a aceptación para operación de campo. Continúa desde 247a199cd1dca62684028741ffad6f4edcfd7b3a; conserva frontend y esquema originales como antecedentes, sin ejecutarlos.

## Procesos e inventario por sistema — revisión del 11/11/2026

Se implementó navegación especialidad → sistema → proceso, con botones internos de alcance/inventario, precomisionamiento, comisionamiento, pruebas integradas, puesta en marcha, manual O&M, capacitaciones, cierre y protocolos. La identificación de activos conserva TAG, tipo, ubicación, red/malla, plano/revisión, acceso y conexiones destino/circuito/barra/fuente. Los registros relacionados se filtran por sistema y etapa; no se atribuye toda una especialidad a un sistema.

Las migraciones 009/010 están aplicadas en el backend exclusivo: requieren sistema y activo concretos antes de registrar una intervención; los pozos requieren red, acceso y conexión significativa. El servidor conserva una copia de identificación/topología por intervención y evita cambiar activos ya utilizados. Los protocolos operativos requieren sistema concreto y bloquean criterios marcados pendientes. Las transcripciones fuente requieren cotejo/clasificación y archivo aceptado coincidente por SHA-256. La importación de borradores es atómica, idempotente por ID y rechaza códigos repetidos con otro ID.

Revisión local de Plan, anexos IIEE/IISS/IIMM/TIC/EM, tablas DOCX, EETT eléctricas PDF 47–48 y detalles de tierras: paquete privado de 45 entradas de catálogo, 49 formatos fuente y 7 documentos. Incluye duplicidad de Telesalud, familias de equipos y subdivisiones propuestas: no acredita 45 sistemas instalados. Las 2981 celdas candidatas requieren cotejo semántico; no son campos de medición operativos validados. Se conservan datos impresos como referencia y respuestas vacías, sin firmas ficticias. La captura y guardado de borradores fuente se comprobó con datos sintéticos; no se acredita disponibilidad operativa de los 49 formatos.

La matriz completa por sistema y el índice de formatos quedan locales en private/technical_review/Alcance_por_sistema_IREN_Sur_R01.html, junto al paquete JSON y plantilla vacía de inventario. No se publican expedientes en el bundle ni en GitHub. No se revisaron íntegramente las 143 páginas escaneadas de EETT ni se acreditó aplicación contractual de anexos complementarios.

La consulta actual reemplaza el diagnóstico histórico de base vacía: hay 268 registros, una cuenta administrativa activa del titular, 40 sistemas de catálogo y 50 protocolos borrador del Plan Cx C01 V3 señalado como borrador no emitido. Hay cero archivos y custodia=false. No se modificó ni duplicó ese catálogo con el paquete local nuevo. Falta conciliar fuentes y correspondencias antes de incorporar más sistemas; no inferir aceptación del V3 por estar cargado. No se comprobó la entrega de correo, MFA del usuario o prueba completa con roles reales.

Validación: 31 pruebas locales; 21 casos de seguridad y 15 de flujo/identificación en SQL transaccional revertido; Chrome real con API simulada (360/390/430/1440), navegación de procesos, alta de pozo/conexiones y llenado/guardado de formato fuente en BORRADOR, además de importación, XLSX y recuperación ante fallo. Dispositivos físicos y aceptación técnica del piloto pendientes.

## Corrección de enfoque — comisionamiento

Tras la aclaración del usuario se verificó que la versión publicada 1 corresponde al commit 07c863b y no contiene módulos de valorización monetaria. Se reorganizó la pantalla principal como control técnico de comisionamiento: acceso directo a pruebas, procedimientos/protocolos y restricciones/liberaciones; detalle por las cinco disciplinas, sistemas, equipos/TAG y siete etapas. No se incorporan resultados ficticios cuando falta información.

Los reportes CSV/XLSX/impresión ahora incluyen el detalle técnico de cada prueba: protocolo/revisión y documento fuente, mediciones/unidades/resultados/criterios, instrumentos/calibración, prerrequisitos y liberación declarados, evidencias y hashes, revisión independiente y pendientes. La aceptación documental se informa por separado. Los registros generales y fechas se conservan.

Esta corrección modifica presentación y reporte; no cambia base de datos, permisos, fechas ni hechos de campo. Compilación, 24 pruebas locales y comprobación Chrome móvil/escritorio satisfactorias. Continúan los límites de activación y aceptación del piloto descritos abajo.

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
- Pruebas SQL revertidas al terminar. La consulta histórica de base vacía fue reemplazada por el corte actual indicado arriba; no se crearon integrantes operativos ficticios en las pruebas.
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
