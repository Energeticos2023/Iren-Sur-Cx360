# IREN Sur CX360

Control privado del comisionamiento del Hospital de Contingencia IREN Sur. Versión 2 para piloto y activación; no implica aceptación de operación de campo ni autoriza energización.

Titular declarado y administrador designado: Ing. José Rafael Zeña Peche, especialista IIEE y líder de comisionamiento por ANIN, jose.zena.p@uni.pe. Designación no equivale a cuenta autenticada, custodia institucional o decisión contractual. Nómina adicional pendiente; no se enviaron invitaciones.

Leer [estado verificado](docs/ESTADO_IMPLEMENTACION.md) y [activación móvil](docs/ACTIVACION_MOVIL.md). Destino privado: https://iren-sur-cx360.energ-ticos-7536.chatgpt.site. Verificar resultado nativo de despliegue; la URL por sí sola no prueba funcionamiento.

## Desarrollo

Node.js 22 o posterior:

```sh
npm ci --ignore-scripts
npm test
npm run build
npm run preview
```

Servir dist/, nunca la raíz del repositorio ni site/ directamente. site/mobile.js es la entrada actual; site/app.js y pruebas históricas se conservan como antecedente. Dependencias fijadas y lockfile; sin dependencias CDN en la aplicación publicada.

Pruebas SQL sintéticas en tests/backend-security.sql y tests/backend-workflow.sql, en transacciones revertidas y exclusivamente en el proyecto dedicado. tests/browser.cjs usa Chrome y API simulada; su ruta de Playwright corresponde al runtime local y debe adaptarse en otro equipo.

## Backend

Supabase exclusivo azajuquqksrjyfbtcujq, organización Energeticos, separado de bases comerciales. Migraciones v2 en supabase/migrations/. No ejecutar supabase/schema.sql, ADMIN_BOOTSTRAP.sql ni seed_catalogo.sql: son antecedentes de v1. Las migraciones v2 ya fueron aplicadas al proyecto exclusivo; no repetir contra otro proyecto sin revisión.

site/public-config.json contiene clave pública específica, no contraseña ni service_role. Las funciones Edge usan secretos de servidor proporcionados por Supabase, nunca enviados al navegador o Git. RLS/funciones controlan disciplina, asignación, autoría, versión, independencia, revocación y auditoría.

No subir expedientes, resultados reales, contraseñas ni tokens a GitHub. private/, tmp/, artifacts/, dist/ y node_modules/ están ignoradas. Las instrucciones originales de instalación son historia y no reemplazan el diagnóstico vigente.
