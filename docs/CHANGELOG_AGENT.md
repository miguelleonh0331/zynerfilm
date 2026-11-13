# CHANGELOG_AGENT.md

Historial append-only de cambios hechos por agentes.

No reescribir entradas antiguas. Agregar nuevas entradas al final con
`repo_agent.py log-change`.

## Formato

### YYYY-MM-DD HH:mm - <agente> - <módulo>

Tipo: fix | feature | refactor | docs | test | chore

Resumen:
Qué se cambió.

Motivo:
Por qué se cambió.

Archivos modificados:
- ruta/archivo

Contrato:
- sin cambios
- modificado con ADR-XXXX

Riesgos:
- ninguno conocido

### 2026-11-13 12:07 - ARCHITECT_AGENT - global

Tipo: docs

Resumen:
Agenda, reglas, contratos y agentes para cuatro módulos; tablero y protocolo de solicitudes.

Motivo:
Preparar escalado por agentes especializados solicitado por el usuario.

Archivos modificados:
- (sin archivos indicados)

Contrato:
- sin cambios

Riesgos:
- ninguno conocido

### 2026-11-13 12:13 - ARCHITECT_AGENT - global

Tipo: refactor

Resumen:
Version 0.2: cuatro modulos implementados, interfaces publicas y composicion raiz; guardado atomico, bloqueo ante catalogo invalido, cierre de sesiones propias y pruebas de servicios/panel.

Motivo:
Migracion inicial autorizada para escalar por agentes sin compartir implementaciones.

Archivos modificados:
- (sin archivos indicados)

Contrato:
- sin cambios

Riesgos:
- ninguno conocido

### 2026-11-13 12:36 - ARCHITECT_AGENT - global

Tipo: feature

Resumen:
MIG-002: Electron y backend web con ADB multiplataforma, video H264 scrcpy y control, autenticacion, portable y plantillas Linux. Catalogo C# conservado.

Motivo:
Permitir administracion por navegador/Electron sobre VPN y futuro servidor CentOS.

Archivos modificados:
- (sin archivos indicados)

Contrato:
- sin cambios

Riesgos:
- ninguno conocido

### 2026-11-13 12:56 - panel_AGENT - panel

Tipo: feature

Resumen:
Sidebar de altas y equipos; cuadricula de miniaturas en directo; ampliacion del mismo canvas y regreso sin reconexion, controles aislados, pausa independiente y prueba browser.

Motivo:
Distribucion de pantallas solicitada por usuario.

Archivos modificados:
- (sin archivos indicados)

Contrato:
- sin cambios

Riesgos:
- ninguno conocido

### 2026-11-13 13:19 - ARCHITECT_AGENT - global

Tipo: feature

Resumen:
DATA-004: popup de alta, dropdown con eliminar, SQLite v1 con migracion JSON unica y backup; API DELETE protegida, pruebas y exportacion GitHub limpia para instalacion mirmidon.

Motivo:
Compactar interfaz y preparar persistencia y distribucion pedidas por usuario.

Archivos modificados:
- (sin archivos indicados)

Contrato:
- sin cambios

Riesgos:
- ninguno conocido

### 2026-11-13 13:49 - panel_AGENT - panel

Tipo: fix

Resumen:
IP, estado y menu agrupados junto al modelo en cabecera; miniatura sin footer

Motivo:
Compactar las tarjetas segun solicitud del usuario

Archivos modificados:
- src/features/panel/web/app.js,src/features/panel/web/style.css,src/features/panel/tests/actions.check.js

Contrato:
- sin cambios

Riesgos:
- ninguno conocido

### 2026-11-13 14:11 - ARCHITECT_AGENT - agentes_ia

Tipo: feature

Resumen:
AI-006: Configuracion OAuth ChatGPT, contexto e historial independientes por movil y portable 0.5

Motivo:
Usuario autoriza conectar una cuenta compartida y un agente independiente por equipo

Archivos modificados:
- server.mjs,package.json,package-lock.json,src/features/agentes_ia,src/features/panel,src/features/web_backend,src/features/desktop_electron,tests/ai-api.test.mjs,docs,agents,agend.md,AGENTS.md,README.md,.gitignore,LICENSES/CODEX.md

Contrato:
- modificado con ADR-0007

Riesgos:
Inferencia real pendiente de vinculacion del usuario; sin captura ni acciones TikTok en esta fase

### 2026-11-13 14:36 - ARCHITECT_AGENT - bot_tiktok

Tipo: feature

Resumen:
BOT-007: modelo/esfuerzo por movil, bot TikTok/Lite y verificacion fisica de scroll/like

Motivo:
Usuario solicita tarea TikTok y autoriza pruebas reales en telefono

Archivos modificados:
- src/features/bot_tiktok,src/features/agentes_ia,src/features/panel,src/features/web_backend,src/features/conexion_adb,src/features/sesiones_scrcpy,server.mjs,package.json,package-lock.json,tests/ai-api.test.mjs,agents,docs,AGENTS.md,agend.md,README.md,LICENSES/pngjs-LICENSE

Contrato:
- modificado con ADR-0008

Riesgos:
Clasifica capturas sin audio; deteccion de corazon Lite depende de interfaz conocida, ante ambiguedad omite like

### 2026-11-13 14:56 - ARCHITECT_AGENT - bot_tiktok

Tipo: feature

Resumen:
BOT-008: dropdown con inicio/paro, indicador verde global, tiempo +/-3s y bloqueo final

Motivo:
Usuario autoriza observar tareas sin popup y bloquear pantalla al completar videos

Archivos modificados:
- src/features/bot_tiktok,src/features/panel,src/features/web_backend,tests/ai-api.test.mjs,package.json,package-lock.json,AGENTS.md,README.md,agend.md,docs

Contrato:
- modificado con ADR-0009

Riesgos:
Si la inferencia tarda mas que el objetivo, no se agrega espera; SLEEP respeta seguridad Android existente

### 2026-11-13 17:18 - audio_groq - audio_groq

Tipo: feature

Resumen:
AUDIO-009: oido Groq para el bot y Resumen de actividad en SQLite

Motivo:
Usuario pide que el bot escuche el audio del video y poder ver cuantos videos recorrio y cuantos likes dio

Archivos modificados:
- src/features/audio_groq,src/features/bot_tiktok,src/features/panel,src/features/web_backend,server.mjs,tests/audio-api.test.mjs,package.json,README.md,docs

Contrato:
- sin cambios

Riesgos:
Clave de Groq solo en directorio privado de datos; transcripcion tratada como dato no confiable; audio interno requiere SDK 30+

### 2026-11-13 17:54 - bot_tiktok - bot_tiktok

Tipo: feature

Resumen:
MEM-010: hilo desechable por analisis, memoria de criterio, triaje por audio y contador de progreso

Motivo:
El contexto crecia un frame por video sin tope; el usuario pide memoria base sin gasto de tokens y ver si la tarea avanza o se colgo

Archivos modificados:
- src/features/agentes_ia,src/features/bot_tiktok,src/features/panel,src/features/web_backend,tests/ai-api.test.mjs,package.json,README.md,docs

Contrato:
- sin cambios

Riesgos:
El triaje por audio no valida que la pantalla sea el feed y debe declinar ante duda; la memoria es dato no confiable y las preferencias mandan; counter.check.js sin ejecutar por falta de escritorio
