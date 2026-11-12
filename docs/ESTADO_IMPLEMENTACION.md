# Asistente Cx contextual — 11/11/2026

- Integrado en el asistente existente: selectores de sistema y etapa. El botón flotante desde una especialidad recoge su contexto; cambios de contexto inician conversación nueva. El contexto acompaña también la búsqueda documental de respaldo.
- Instrucciones reforzadas: respuesta breve, distinción requisito/propuesta/síntesis, configuración real solo con fuente, no asumir jerarquía contractual ni cobertura completa. Pruebas integradas diferenciadas del servicio y sistemas pasivos sin arranque ficticio.
- Respuestas IA sin citas o con marcadores inexistentes pasan al respaldo documental. Esto valida referencias, no garantiza correspondencia semántica de cada afirmación.
- Función cx360-asistente v4 desplegada, JWT conservado. No se incorporaron expedientes ni usuarios nuevos ni se cambiaron permisos o secretos del proveedor IA.
- Verificación local: 57 pruebas aprobadas y compilación de frontend y función correcta. Navegador real bloqueado por el entorno (socket de Chromium no permitido); prueba E2E con usuario real y modo IA real pendientes. No declarar cobertura íntegra del expediente.
- Comprobación del servicio desplegado: solicitud sin sesión rechazada con HTTP 401. Publicación directa en main rechazada por revisión automática; interfaz preparada en rama para revisión.
- El destino Sites histórico devuelve «project not found» en esta conexión. La publicación de la interfaz en GitHub Pages está pendiente de integrar la rama revisable; no se crea otro sitio ni se modifica audiencia.

---

# CX360 v2.5 — Pestañas por fase dentro de cada especialidad, 11/11/2026 (noche)

- **Fases dentro de cada especialidad**: Resumen · 1 Precomisionamiento · 2 Pruebas · 3 Puesta en marcha · 4 Manual O&M · 5 Capacitaciones. Filtro por sistema (Todos, EL-01…), impresión de la fase y botón para abrir el sistema (vista v2.4 con sus etapas y registros).
- Cada fase muestra, por sistema y en líneas cortas, lo que corresponde según la matriz de alcance privada (`cx_scope_matrix`): qué se interviene (subsistemas y elementos, p. ej. los cinco sistemas de puesta a tierra con sus pozos), revisión documental, verificación física según plano y liberación (Precomisionamiento); mediciones sin tensión, pruebas con energía, instrumentos y criterio por subsistema (Pruebas); operación e interfaces (Puesta en marcha); contenido del Manual y entrega (O&M); capacitación. Cada ítem lleva su origen (A Alcance ANIN · C propuesta del Contratista · D diseño C01) y referencia. Se listan los protocolos de la fase y los registros programados (hitos, pruebas HP, capacitaciones) con fecha y estado.
- Criterio de fases acordado con el especialista: las mediciones sin tensión (continuidad, aislamiento, resistencia de puesta a tierra) se muestran en **Pruebas**; el Plan Cx del Contratista las registra como L2.
- Matriz IIEE ampliada en el servidor: instrumentos por sistema (EL-01 a EL-07, con fuente) y en EL-06 aislamiento de circuitos derivados, tensión/corriente por circuito, encendido por interruptor y el pendiente de identificar los circuitos de alumbrado exterior.
- **Asistente Cx preciso y conciso**: 239 fichas «Matriz CX360» (sistema × fase + qué se interviene) generadas en el servidor con `cx_private.build_scope_kb()`; la búsqueda reconoce el sistema por sus palabras (pozos a tierra, alumbrado, grupo electrógeno…) y la fase preguntada. Sin IA, responde con la ficha exacta; con IA, instrucciones de respuesta corta (≈150 palabras, viñetas de una línea) y `max_tokens` 900. Preguntas de EPP, seguridad o herramientas siguen priorizando los documentos originales.
- Migración `202611120001_matriz_fases_asistente.sql` (estructura y lógica; el contenido sigue fuera de Git). Función `cx360-asistente` v3 desplegada.
- Pruebas: 53 unitarias (7 nuevas de `scope-core`), `browser-phases.cjs` (390 y 1440 px, sin desbordamiento ni errores JS), `browser-plan.cjs` (aserción L1–L5 obsoleta reemplazada por las 7 etapas) y `browser-assistant.cjs` aprobadas. `tests/browser.cjs` no se ejecuta en este entorno (dependencia ausente, igual que antes del cambio).

---

# CX360 v2.4 — Diseño por especialidad con pestañas por sistema, 11/11/2026

- **Nueva estructura de navegación**: barra lateral fija en escritorio (General, Especialidades, Control, Registros, Sistema) y menú desplegable con franja de accesos rápidos en tableta y celular.
- **Una pestaña por especialidad**: Instalaciones Eléctricas (IIEE), Sanitarias (IISS), Mecánicas (IIMM), TIC y Equipamiento Médico (EM), cada una con su color, ícono y cabecera de indicadores (protocolos publicados, pruebas cerradas, avisos ACONEX vencidos, próxima prueba).
- **Subpestañas por sistema** (EL-01, EL-02… TI-00… EM-…): ficha del sistema, avance de pruebas por nivel L1–L5 (sin prueba / programada / en curso / observada / cerrada), protocolos, pruebas, hitos, restricciones, capacitación y OyM del sistema, y preguntas directas al Asistente Cx con la especialidad ya fijada.
- **Resumen de la especialidad**: índice de sistemas con su barra L1–L5, próximas pruebas y restricciones abiertas.
- Tipografía Barlow autoalojada (licencia OFL, sin servicios externos), íconos en línea, texto alineado a la izquierda, foco visible y movimiento reducido respetado. El avance se muestra por estado de pruebas registradas; no se publica porcentaje (pesos L1–L5 pendientes de aceptación, D-09).
- Pruebas: 42 unitarias (5 nuevas de `specialty-core`), `browser-plan.cjs` con lote sintético y con el lote privado (268 registros, 40 sistemas), `browser-assistant.cjs`; sin desbordamiento a 390 y 1440 px ni errores JS.

---

# CX360 v2.3 — Asistente Cx potenciado, 11/11/2026

- **Glosario CX360** (8 fichas) y **Guía CX360** (11 fichas curadas por especialidad: precomisionamiento, pruebas, equipos y herramientas, formatos; con numerales de referencia) agregados a la base documental privada (889 fragmentos).
- Sinónimos y siglas administrables (`cx_private.kb_synonyms`): IIEE, IISS, IIMM, TIC, EM, L1–L5, precomisionamiento, puesta en marcha, HP, GE, TTA, MT, EPP, PETAR, etc.; prioridad a la especialidad nombrada en la pregunta y al documento citado.
- Función `cx360-asistente` v2: selección diversa de fuentes (máx. 2 guías y 1 glosario), **respuesta documental compuesta sin IA** (guía o glosario + extractos literales citados), glosario en las instrucciones de la IA, respuestas más completas (hasta 1 800 tokens).
- Pantalla: etiqueta del tipo de respuesta, fuentes «síntesis CX360», panel de siglas y nuevas preguntas frecuentes.
- Pruebas: 37 unitarias; `browser-assistant.cjs` (incluye respuesta documental compuesta y glosario) y `browser-plan.cjs` aprobadas; búsqueda verificada en servidor con la cuenta del administrador simulada (la pregunta «¿qué actividades se desarrollan en el precomisionamiento del sistema de instalaciones eléctricas?» devuelve primero la guía IIEE-PRE).

---

# CX360 v2.2 — Asistente Cx, 11/11/2026

Continúa desde v2.1 (61e2eda). Detalle y activación en [ASISTENTE_CX.md](ASISTENTE_CX.md).

## Implementado en v2.2

- **Asistente Cx** (pestaña y botón flotante): consultas sobre alcance, pruebas, equipos, herramientas, criterios, EPP, protocolos, testificación, capacitación y OyM, con respuesta citada [F#] al documento, numeral y página.
- **Base documental privada** cargada en servidor: 870 fragmentos de Anexo 12, Anexo 16, Plan de Comisionamiento ANIN, Anexos 1 a 5 (con sus formatos) y Plan Cx C01 V3 (borrador). En `cx_private`, no expuesta por la API ni versionada en Git.
- Búsqueda en español (`cx_kb_search`): sin tildes, raíces, sinónimos de siglas, ponderación por rareza del término y por título, bono por código de sistema (EL-03, TI-07…) y por documento citado. Solo miembros activos.
- Función Edge `cx360-asistente` (v1, JWT y orígenes permitidos): cuota diaria por persona (80, configurable por el administrador), bitácora privada de uso, modo IA con instrucciones fijas (solo fuentes, jerarquía documental, no inventar, roles NEC4) y modo documental de respaldo. El modo IA se activa con el secreto `ANTHROPIC_API_KEY` (pendiente del titular).
- Administración → Asistente Cx: habilitar/deshabilitar y cuota diaria.

## Probado en v2.2

- 37 pruebas automáticas (8 nuevas del asistente: render seguro, citas, historial, exportación, validación).
- Chrome con API simulada (`tests/browser-assistant.cjs`): botón flotante, respuesta con citas, apertura de fuente y fragmento completo, copiar con fuentes, repregunta con historial, modo documental, cuota agotada, respaldo por búsqueda directa, configuración del administrador; sin HTML inyectado, sin desbordamiento a 360/430/1440 px, sin errores JS. `tests/browser-plan.cjs` sigue aprobando.
- Búsqueda evaluada localmente (PGlite + unaccent) con 14 preguntas tipo; en servidor, función y permisos verificados (anónimos rechazados).
- No probado: modo IA real (sin clave configurada) ni consulta con la cuenta real desde el sitio publicado.

## Pendientes

1. Configurar `ANTHROPIC_API_KEY` en los secretos de Edge Functions para el modo IA.
2. Confirmar en Supabase la eliminación definitiva de la función temporal de carga `cx_tmp_kb_upload` (ya neutralizada: solo devuelve error y no tiene permisos).
3. Pulsar **Cargar catálogo en CX360** (sigue pendiente desde v2.1).

---

# CX360 v2.1 — Estado verificado, 11/11/2026 (tarde)

Continúa desde 07c863b. Lo de v2 (más abajo) sigue vigente salvo lo que aquí se indica.

## Implementado en v2.1

- **Publicación en GitHub Pages**: destino https://energeticos2023.github.io/Iren-Sur-Cx360/ (rama `gh-pages`). Cada push a `main` ejecuta pruebas, compila y publica (`.github/workflows/pages.yml`); también `npm run deploy:pages`. Requiere repositorio público y Pages activado desde `gh-pages` (acción del titular). La URL de ChatGPT Sites se mantiene como origen permitido.
- **Funciones Edge** `cx360-upload` (v3) y `cx360-invite` (v2): lista de orígenes permitidos (Sites y Pages); la invitación redirige al sitio de origen. Redirecciones de la app según la ruta real (`location.pathname`).
- **Catálogo provisional Plan Cx C01 V3** (lote `PLANCX-V3`, 268 registros) en `cx_private.catalog_seed`, no expuesto por la API ni versionado en Git: 40 sistemas, 8 paquetes/documentos, 50 protocolos de campo (644 ítems tomados de los formatos de los Anexos 1–5 y de las fichas; 91 criterios «POR FIJAR» según Apéndice V), 55 pruebas (27 presenciadas con fecha límite de aviso ACONEX), 35 hitos/actividades (hitos H, liberaciones por sector, llegadas de equipos del Cronograma de Avance, olas de traslado), 8 capacitaciones, 9 hitos OyM y 63 restricciones (D-01–D-10, R-01–R-13, INC-01–26, V-01–V-14).
- `cx_load_catalog(batch)`: carga atómica e idempotente solo por el administrador autenticado, con su identidad como autor y auditoría por registro. `cx_catalog_status()` para coordinación. No sobrescribe códigos existentes.
- Disparador `cx_block_unfixed_criteria`: el servidor rechaza publicar un protocolo con criterios «POR FIJAR».
- **Pantalla Plan Cx**: matriz sistema × nivel L1–L5 con estado de cada prueba, protocolos con conteo de criterios por fijar, hitos con holgura y criticidad, paquetes documentales. Sin porcentajes: numerador/denominador sobre universo provisional (pesos L1–L5 pendientes, D-09).
- **Protocolos de campo**: ejecución agrupada por secciones; ítems SÍ/NO/N.A. que proponen CONFORME/NO CONFORME/NO VERIFICABLE; mediciones con unidad, criterio y fuente. Impresión del protocolo en blanco o del registro de prueba con encabezado ANIN, prerrequisitos, equipos de medición, observaciones y firmas (ejecutor/gestor/cliente). El editor de protocolos conserva tipo y sección.
- **Seguimiento y alertas**: avisos ACONEX (vencido, por vencer ≤ 7 d, programado, registrado), próximas 2 semanas, vencidas según línea base y restricciones abiertas por tipo; CSV e impresión. Registro de la referencia del aviso ACONEX y de la fecha real de presentación de documentos o cumplimiento OyM, sin cambiar el estado ni remitir nada.
- Correcciones: el formulario conserva estados no listados (p. ej. NO INICIADO) y el vínculo a protocolos en borrador; se muestran los campos adicionales del catálogo en modo lectura.

## Probado en v2.1

- 29 pruebas automáticas locales (21 previas + 8 de `plan-core`).
- Chrome real con API simulada (`tests/browser-plan.cjs`): carga de catálogo por RPC, matriz con los 40 sistemas, seguimiento, impresión de protocolo con todos sus campos, conservación de estado y vínculo, SÍ→CONFORME, registro de aviso ACONEX; sin desbordamiento a 360/390/430/1440 px; sin errores JS. Ejecutado con datos sintéticos y con el lote real local (no versionado). Revisión visual de PDF A4 del protocolo impreso.
- Base: lote verificado en servidor (268 registros, 644 ítems, 91 «POR FIJAR»); canal temporal de carga eliminado; asesor de seguridad sin funciones ejecutables por anónimos.
- No probado: carga real con la cuenta del administrador (la cuenta aún no existe: 0 usuarios), dispositivos físicos, Safari.

## Pendientes inmediatos (titular)

1. Crear la cuenta del administrador (Supabase → Authentication → Users → Add user, *Auto Confirm*).
2. Repositorio público y Pages desde `gh-pages`; Site URL y Redirect URLs de Auth con la URL de Pages.
3. Ingresar, configurar MFA y pulsar **Cargar catálogo en CX360** (Plan Cx o Administración).
4. Fijar los 14 criterios del Apéndice V en los protocolos antes de publicarlos; registrar las presentaciones y avisos reales.

---

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
