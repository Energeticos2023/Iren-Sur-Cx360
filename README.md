# IREN Sur CX360

Control privado del comisionamiento del Hospital de Contingencia IREN Sur. Versión 2 para piloto y activación; no implica aceptación de operación de campo ni autoriza energización.

Titular declarado y administrador designado: Ing. José Rafael Zeña Peche, especialista IIEE y líder de comisionamiento por ANIN, jose.zena.p@uni.pe. Designación no equivale a cuenta autenticada, custodia institucional o decisión contractual. Nómina adicional pendiente; no se enviaron invitaciones.

Leer [estado verificado](docs/ESTADO_IMPLEMENTACION.md) y [activación móvil](docs/ACTIVACION_MOVIL.md).

Publicación: **https://energeticos2023.github.io/Iren-Sur-Cx360/** (GitHub Pages, rama `gh-pages`, desplegada automáticamente en cada push a `main`). Los datos no están en el sitio: requieren cuenta autorizada, MFA y RLS en Supabase. Destino anterior (ChatGPT Sites, privado): https://iren-sur-cx360.energ-ticos-7536.chatgpt.site.

## Desarrollo

Node.js 22 o posterior:

```sh
npm ci --ignore-scripts
npm test
npm run build
npm run preview
npm run deploy:pages   # publicación manual alternativa
```

Prueba de navegador (Chrome + Playwright, API simulada): `node scripts/preview.cjs & node tests/browser-plan.cjs`. Con el lote privado local: `CX360_SEED=private/catalog/seed_plancx_v3.json node tests/browser-plan.cjs`.

Servir dist/, nunca la raíz del repositorio ni site/ directamente. site/mobile.js es la entrada actual; site/app.js y pruebas históricas se conservan como antecedente. Dependencias fijadas y lockfile; sin dependencias CDN en la aplicación publicada.

Pruebas SQL sintéticas en tests/backend-security.sql y tests/backend-workflow.sql, en transacciones revertidas y exclusivamente en el proyecto dedicado. tests/browser.cjs usa Chrome y API simulada; su ruta de Playwright corresponde al runtime local y debe adaptarse en otro equipo.

## Backend

Supabase exclusivo azajuquqksrjyfbtcujq, organización Energeticos, separado de bases comerciales. Migraciones v2 en supabase/migrations/. No ejecutar supabase/schema.sql, ADMIN_BOOTSTRAP.sql ni seed_catalogo.sql: son antecedentes de v1. Las migraciones v2 ya fueron aplicadas al proyecto exclusivo; no repetir contra otro proyecto sin revisión.

site/public-config.json contiene clave pública específica, no contraseña ni service_role. Las funciones Edge usan secretos de servidor proporcionados por Supabase, nunca enviados al navegador o Git. RLS/funciones controlan disciplina, asignación, autoría, versión, independencia, revocación y auditoría.

El catálogo del Plan Cx se carga por lotes en `cx_private.catalog_seed` (no expuesto por la API) y se materializa con `cx_load_catalog` por el administrador; su generador y datos viven en `private/` (ignorado por Git).

No subir expedientes, resultados reales, contraseñas ni tokens a GitHub: el repositorio es público. private/, tmp/, artifacts/, dist/ y node_modules/ están ignoradas. Las instrucciones originales de instalación son historia y no reemplazan el diagnóstico vigente.
