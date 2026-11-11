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
