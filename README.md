# IREN SUR CX 360

Aplicación interna de seguimiento de **precomisionamiento, comisionamiento, pruebas integradas, puesta en marcha y cierre** del **Hospital de Contingencia IREN Sur (ANIN)**.

> **ESTADO: EN CONSTRUCCIÓN. No publicado ni autorizado para datos contractuales reales.**

## Principios obligatorios
- Repositorio **privado**. Los expedientes reservados se almacenarán únicamente en un repositorio documental autorizado y almacenamiento privado, nunca dentro de GitHub ni de recursos web públicos.
- Acceso por invitación individual del administrador de ANIN. Sin registro libre y **sin acceso para la contratista**.
- Perfiles de Coordinación ANIN, Gerente de Proyecto, KP1, Supervisión, especialistas, Riesgos y SSOMA.
- Cinco disciplinas: IIEE, IISS, IIMM, TIC y equipamiento médico; fases: precomisionamiento, pruebas funcionales e integradas, puesta en marcha, O&M/capacitación y cierre.
- Cronograma versionado con actividades diarias, retrasos, evidencia, responsables y propuesta de reprogramación. No alterar la línea base ni el Programa Aceptado automáticamente.
- Protocolos **no operativos** hasta contar con documentación aceptada y evidencia de la decisión competente.
- Evidencias, observaciones y firmas de revisión en la aplicación **no sustituyen** Aconex, ACC ni decisiones contractuales del Gerente de Proyecto.
- Nunca inventar fechas, pruebas, resultados, criterios de aceptación ni estados documentales.

## Arquitectura prevista
1. Código fuente: repositorio privado GitHub.
2. Base de datos, usuarios y almacenamiento: proyecto Supabase **exclusivo y separado de IREN Sur**, con RLS y buckets privados.
3. Alojamiento: PWA HTTPS instalable en Android/iPhone, con login obligatorio para los datos.
4. Respaldos, auditoría y control de acceso probado antes de la publicación.

## Siguientes pasos técnicos
- Importar el paquete `IREN_SUR_CX_360_GitHub_Supabase_v1.zip` generado en el proyecto, colocando su contenido **descomprimido** en este repositorio.
- Crear una organización/proyecto Supabase específico para IREN Sur con propietario institucional autorizado, y comprobar su costo antes de contratarlo.
- Inspeccionar y probar el esquema SQL y las políticas de acceso; no ejecutar scripts de bootstrap sin verificar identidad, roles y permisos.
- Conectar el frontend exclusivamente mediante `SUPABASE_URL` y clave pública; prohibido subir claves secretas o `service_role`.
- Probar acceso anónimo, usuario no autorizado, revocación, permisos por especialidad, archivos privados, protocolos, cronograma y auditoría.
- Publicar la PWA solo cuando las pruebas técnicas y autorizaciones institucionales se completen.

**Separación de titularidad:** aunque el repositorio se encuentra actualmente en la cuenta GitHub `Energeticos2023`, su contenido debe permanecer separado de cualquier proyecto comercial; ANIN debe validar la cuenta administradora y la titularidad institucional antes de alojar documentación reservada.
