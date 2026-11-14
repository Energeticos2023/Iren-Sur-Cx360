# SUSTENTA R4 · 14 de noviembre de 2026

La revisión conserva los dos accesos públicos, la identidad de SUSTENTA y el backend existente. Mejora el acceso, la lectura del análisis y la preparación de descargas.

- Acceso adaptable con control para mostrar la contraseña y errores diferenciados de credenciales, autorización y conexión.
- Vista guiada con una carta ficticia. No permite cargar documentos privados ni realiza consultas de IA; no otorga una sesión ni sustituye la autorización de miembros.
- Navegación por carga, revisión y descarga; indicadores de palabras, formato, tamaño y cambios pendientes.
- Filtros de severidad y descarga TXT del dictamen, propuestas y aclaraciones. La descarga indica si el documento cambió después del análisis.
- Análisis y chat usan el texto de trabajo actual. Una modificación marca el dictamen anterior como pendiente de actualización.
- Exclusión de consultas simultáneas, cancelación de solicitudes al cambiar de archivo o sesión y límites de espera. Comprobar la conexión solo consulta el estado; no consume otra revisión.
- Restauración del texto original, aviso de cambios sin descargar y descarga TXT independiente de la exportación Word.
- La exportación DOCX continúa limitada a los párrafos simples compatibles y requiere confirmación. Captura la versión solicitada antes de las operaciones asíncronas. PDF/TXT no se presentan como Word con diseño preservado.
- Contraseñas, tokens y contenido de documentos no se guardan en almacenamiento local. El cierre limpia la sesión y los elementos de revisión.

## Verificación

`npm test`: 71 pruebas, incluidas 12 nuevas pruebas de flujos SUSTENTA con respuestas de red controladas. Cubren autorización, indisponibilidad IA, el aislamiento de la vista guiada, texto editado, concurrencia, respuestas tardías, carga fallida, confirmación de Word y filtros.

`npm run build` y `git diff --check` completados. Comprobación visual del acceso y del ejemplo en escritorio (1440 px) y móvil (390 px), sin desbordamiento horizontal. Edición y descarga TXT verificadas en navegador.

El análisis real con una cuenta autorizada y las descargas DOCX con documentos reales requieren validación por el usuario; no se consumieron consultas OpenAI ni se enviaron expedientes durante estas pruebas. No se modificaron el modelo, el prompt, las cuotas ni las políticas de autorización del servidor.
