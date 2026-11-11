# Procesos dentro de cada sistema

Se conservan las especialidades y sistemas de v2.4. Cada sistema incorpora botones para precomisionamiento, comisionamiento funcional, pruebas integradas, puesta en marcha, manual O&M, capacitación y cierre. Los formularios nuevos heredan sistema, especialidad y etapa; las pruebas preparadas desde un protocolo heredan esa identificación. Los registros antiguos sin clasificación se muestran aparte, sin desaparecer.

La ficha del sistema permite registrar límites e interfaces, condición del alcance y requisitos por etapa con documento, revisión, página y criterio. El inventario guarda TAG, tipo, subsistema, ubicación, plano, circuitos, conexiones a otros TAG y fuente. Cada fila representa un elemento identificado; el conteo no certifica completitud. Para puesta a tierra se distingue el elemento físico (pozo/electrodo) del sistema interconectado. La identificación del objeto de cada ensayo se registra en Equipo/TAG del protocolo y de la prueba.

No se han incorporado cantidades, ubicaciones, resultados ni límites técnicos ficticios. La definición contractual por sistema requiere contrastar el Alcance vigente, los planos y procedimientos aceptados y los protocolos de los anexos. La existencia de un catálogo o una propuesta no acredita aceptación. Las nuevas fichas son campos de registro, no una matriz contractual ya completada.

Persistencia: se utiliza el payload de cx_records y el RPC existente, conservando permisos, versión y auditoría. La validación del inventario en el formulario exige TAG único, tipo y ubicación; no constituye un nuevo control de integridad del servidor. No se aplicaron migraciones ni cambios de permisos. Falta validar guardado y revisión con usuarios autenticados reales.

Validación local: 46 pruebas automatizadas aprobadas y compilación correcta. Incluye aislamiento entre sistemas/especialidades, clasificación, inventario y renderizado de las siete etapas. La inspección visual no se completó por tiempo de espera de la herramienta de navegador. El despliegue depende del flujo existente de GitHub Pages.
