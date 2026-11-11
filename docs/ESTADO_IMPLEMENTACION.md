# Estado comprobado — 11/11/2026

## Resultado
Código fuente recuperado del paquete IREN_SUR_CX_360_GitHub_Supabase_v1.zip e incorporado para continuar el desarrollo. No es una aplicación terminada ni está habilitada para operación. No ejecutar el esquema original contra producción: los siguientes controles siguen pendientes.

## Verificación realizada
- El repositorio privado tenía únicamente README.md y .gitignore en main.
- Solo se encontraron los proyectos Supabase Energeticos_Academia y YACUSOL_Gestion en la conexión disponible. No se modificó ninguno.
- Corregida la carga de datos: un error ya no se presenta como una lista vacía ni como cero observaciones. Se borran datos previos y se ofrece reintento.
- Corregido el filtro de actividades por sistema seleccionado.
- El aviso de configuración puede mostrarse sin cargar previamente la dependencia externa. Fallos de inicio muestran un error visible.
- Cierre de sesión limpia registros y formularios de la interfaz.
- Cuatro pruebas automáticas locales aprobadas; sintaxis JavaScript verificada. No equivalen a pruebas de navegador, integración, seguridad de base de datos ni aceptación móvil.

## Bloqueos de software para producción
1. RLS: actualmente los miembros activos pueden consultar todas las especialidades; las políticas de actualización tampoco restringen especialidad/asignación. Implementar y probar permisos por registro, documentos y almacenamiento.
2. Autoría: campos created_by, performed_by y verified_by admiten valores enviados por el cliente. Fijar identidad en servidor, impedir suplantación y autoverificación; timestamps de servidor.
3. Protocolos: falta flujo de publicación con versión inmutable, evidencia formal completa y revisión independiente. La interfaz crea borradores pero no completa la vinculación/publicación.
4. Pruebas: falta formulario de mediciones basado en versión de protocolo, instrumentos/calibración, controles SSOMA estructurados, evidencia fotográfica y revisión independiente. El guard actual no revalida documento fuente revocado y no exige SSOMA completo.
5. Cronograma: falta importación CSV/XLSX validada, asociación a sistemas/línea base, dependencias y transacción atómica para estado y motivo. Las dos escrituras actuales pueden quedar parcialmente guardadas.
6. Cierre: faltan flujos completos de O&M, capacitación, entrega, reportes PDF/XLSX e historial visible. No confundir etiquetas de etapas con módulos implementados.
7. Autenticación: probar invitación/recuperación, revocación y MFA; eliminar exposición innecesaria de errores. No se enviaron invitaciones.
8. Archivos: falta control documental por especialidad, integridad/hash, verificación de tipos/tamaño y reconciliación de cargas huérfanas.
9. PWA: solo existe caché de interfaz; no hay captura ni sincronización offline acreditadas. Revisar alcance de caché y probar Android/iPhone.
10. Dependencias: verificar disponibilidad de la versión declarada y empaquetar con lockfile; falta build reproducible.

## Decisiones externas necesarias
- Organización/propietario autorizado del proyecto Supabase exclusivo y condiciones de costo.
- Cuenta inicial administradora y dominio/alojamiento HTTPS para el piloto.
- Autorización institucional de custodia antes de cargar documentos reales.

## Criterio de finalización
No declarar terminado hasta implementar los flujos faltantes, verificar permisos positivos y negativos en backend, recuperación de respaldo, pruebas móviles y aceptación del piloto por los responsables. Conservar datos sintéticos separados de cualquier dato real. La aplicación no autoriza energización ni emite aceptación contractual.
