# IREN SUR CX 360 – Aplicación PWA ANIN (fuente independiente)

**Estado:** Código fuente funcional de referencia, NO desplegado ni autorizado para cargar documentos contractuales. Antes de producción ejecutar las pruebas de permisos y seguridad descritas al final. **No incluye demostraciones numéricas, usuarios, contraseñas, protocolos aprobados ni archivos reservados.**

## Arquitectura

- `site/`: aplicación móvil instalable tipo PWA HTML/CSS/JavaScript. Cloudflare Pages debe publicar **SOLO esta carpeta**. Un sitio necesita una URL pública de acceso a login, pero todos los datos permanecen detrás de Supabase Auth + RLS.
- `supabase/schema.sql`: esquema y permisos de PostgreSQL, políticas RLS, documentos, pruebas, bloqueos operativos y auditoría. Solo para un **proyecto Supabase independiente y exclusivo de ANIN**.
- `supabase/seed_catalogo.sql`: catálogo de los 36 sistemas descriptivos del Plan ANIN. No constituye aceptación, ni comprueba existencia de instalación.
- `supabase/functions/invite-member/index.ts`: función de servidor para enviar invitaciones por correo (no expone service_role en cliente).
- `supabase/ADMIN_BOOTSTRAP.sql`: plantilla manual para habilitar el primer administrador a partir de un usuario autenticado previamente creado en Auth.
- `catalogo_referencia_para_importacion.json`: respaldo documental del catálogo sin datos de ejecución.

## Pasos de instalación institucional

1. Crear una organización y un **proyecto Supabase nuevos** cuyo propietario/autorizante sea ANIN. Nunca usar proyectos ENERGÉTICOS/YACUSOL ni espacios de trabajo comerciales.
2. En SQL Editor ejecutar `supabase/schema.sql` una vez. Ejecutar `supabase/seed_catalogo.sql` y verificar los sistemas con `select specialty,count(*) from public.cx_systems group by specialty`.
3. En Authentication > Providers, desactivar alta libre de usuarios, configurar restricciones de correo según ANIN. En Dashboard > Authentication > Users crear de forma segura la cuenta inicial del administrador. Sustituir los valores en `ADMIN_BOOTSTRAP.sql` **solo dentro de SQL Editor**, sin subirlos a GitHub.
4. Desplegar la Edge Function `invite-member` con secrets `CX360_SITE_ORIGIN` y `CX360_SITE_URL`, URL Supabase y service_role de servidor (nunca en navegador). Establecer `SITE_ORIGIN` a la URL de producción.
5. Crear un repositorio GitHub **privado e independiente**, preferiblemente bajo cuenta institucional ANIN, e importar este código. No agregar archivos de expedientes al repositorio.
6. Conectar ese repositorio a Cloudflare Pages; deploy de activos estáticos usando **`site` como directorio de salida** (sin comandos de build). No desplegar la raíz del repositorio.
7. Copiar `site/config.example.js` a `site/config.js` y completar ÚNICAMENTE la URL pública Supabase y su clave `sb_publishable_...`. Estas son credenciales públicas para navegador; toda la protección real depende de Auth+RLS. No compartir service_role.
8. Verificar con un correo autorizado y otro sin autorización; comprobar usuarios de ANIN, GP, KP1, especialistas y revocación de acceso. Solo después habilitar documento real y publicación institucional.
9. En Android: abrir la URL HTTPS en Chrome y seleccionar **Instalar aplicación** / **Añadir a pantalla principal**. En iPhone: abrir en Safari > Compartir > **Añadir a pantalla de inicio**. Los especialistas no requieren pagar ChatGPT, Lovable ni GitHub.

## Lo que sí está previsto en código

Autenticación con correo+contraseña y allowlist, control por roles; panel diario y GP; sistemas IIEE, IISS, IIMM, TIC, equipamiento médico; agenda, cronograma, propuesta de reprogramación sin alterar baseline; carga de documentos a bucket privado; flujo de referencia a aprobación GP; borradores de protocolos bloqueados; pruebas solo con protocolo operativo; SSOMA, observaciones; registro de auditoría en base; PWA con app-shell (NO garantiza captura/sincronización offline); gestión de invitaciones por Edge Function.

## Limitaciones y verificaciones exigidas antes del uso real

- **No ha sido ejecutada contra una cuenta Supabase ANIN real**. Las operaciones y políticas SQL requieren pruebas de extremo a extremo antes de cualquier dato contractual.
- La función de «acreditación GP» registra una referencia declarada; para producción se requiere validar el archivo/comunicación oficial, identidad competente y trazabilidad documental. No es firma digital ni aprobación contractual.
- La plantilla de protocolo se crea como **BORRADOR NO APROBADO**; no se presentan protocolos definitivos hasta recibir los aceptados por GP.
- Requiere prueba de privacidad del almacenamiento, invitaciones, MFA opcional, rotación de claves, cuotas, backups, pruebas móviles y recuperación frente a caídas de conexión.
- La app no debe considerarse archivo maestro institucional oficial sin autorización de ANIN. No sustituye ACC, Aconex ni Programa Aceptado NEC4.
- La aplicación cliente usa import ESM fijado de Supabase (`https://esm.sh/@supabase/supabase-js@2.119.0`); para un despliegue institucional sostenido es preferible empaquetar la dependencia mediante proceso reproducible con archivo lock y revisión de dependencias.
- El icono PWA es un elemento genérico preparado, no una certificación de marca. La cabecera sí usa logotipo ANIN extraído del archivo adjunto.

## Seguridad mínima de aprobación de despliegue

1. Usuario sin sesión: consultas al API/Storage bloqueadas.
2. Correo no invitado que obtiene cuenta: sin membresía no ve documentos/sistemas.
3. Especialista: no invita, no acepta ni modifica documentos; sólo registros permitidos.
4. GP: vista general pero no acepta automáticamente pruebas/documentos.
5. Administrador: controla invitaciones y expediente con referencia de decisión.
6. Protocolo BORRADOR: no puede abrir prueba en ejecución (control de base).
7. Protocolo OPERATIVO: exige documento con evidencia GP (control de base).
8. Prueba CERRADA: exige verificador y fecha; no sustituye firma contractual.
9. Documentos privados: un usuario anónimo no accede incluso con URL de archivo.
10. Cambios a cronograma y hallazgos: conservan entrada de auditoría sin borrar historial.

**No hay dependencia de créditos Lovable para modificar este código.** El alojamiento, los límites del plan Supabase y la operación siguen sujetos a las políticas de cada proveedor; la gobernanza final de ANIN se debe decidir institucionalmente.
