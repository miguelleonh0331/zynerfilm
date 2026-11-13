# MODULE_MAP.md

Archivo autogenerado por `repo_agent.py map`. No editar a mano.

Última generación: 2026-11-13 17:54

## Módulos

| Módulo | Ruta | Agente | Propósito | Contrato |
|---|---|---|---|---|
| agentes_ia | src/features/agentes_ia | agentes_ia_AGENT.md | (sin descripción) | src/features/agentes_ia/CONTRACT.md |
| audio_groq | src/features/audio_groq | audio_groq_AGENT.md | Darle oído al bot: captura unos segundos del audio interno que está reproduciendo el | src/features/audio_groq/CONTRACT.md |
| bot_tiktok | src/features/bot_tiktok | bot_tiktok_AGENT.md | (sin descripción) | src/features/bot_tiktok/CONTRACT.md |
| conexion_adb | src/features/conexion_adb | conexion_adb_AGENT.md | (sin descripción) | src/features/conexion_adb/CONTRACT.md |
| desktop_electron | src/features/desktop_electron | desktop_electron_AGENT.md | (sin descripción) | src/features/desktop_electron/CONTRACT.md |
| equipos | src/features/equipos | equipos_AGENT.md | (sin descripción) | src/features/equipos/CONTRACT.md |
| panel | src/features/panel | panel_AGENT.md | (sin descripción) | src/features/panel/CONTRACT.md |
| sesiones_scrcpy | src/features/sesiones_scrcpy | sesiones_scrcpy_AGENT.md | (sin descripción) | src/features/sesiones_scrcpy/CONTRACT.md |
| web_backend | src/features/web_backend | web_backend_AGENT.md | (sin descripción) | src/features/web_backend/CONTRACT.md |

## Dependencias entre módulos

| Módulo | Depende de | Estado |
|---|---|---|
| audio_groq | `conexion_adb` (solo API publica); | módulo inexistente |
| audio_groq | Node estandar (`node:net`, `node:crypto`, `node:fs/promises`, `node:path`, `node:timers/promises`, `fetch`, `FormData`); | módulo inexistente |
| audio_groq | `scrcpy-server` 3.3.4 ya distribuido en `motor/`; | módulo inexistente |
| audio_groq | API HTTP de Groq `https://api.groq.com/openai/v1/audio/transcriptions`, modelo `whisper-large-v3-turbo` | módulo inexistente |
| bot_tiktok | agentes_ia | ok |
| bot_tiktok | conexion_adb | ok |
| conexion_adb | Ninguna dependencia de otros modulos | módulo inexistente |
| desktop_electron | web_backend | ok |
| desktop_electron | panel | ok |
| equipos | Ninguna dependencia de otros modulos | módulo inexistente |
| panel | web_backend | ok |
| panel | conexion_adb (solo alternativa C# 0.2) | módulo inexistente |
| panel | equipos (solo alternativa C# 0.2) | módulo inexistente |
| panel | sesiones_scrcpy (solo alternativa C# 0.2) | módulo inexistente |
| sesiones_scrcpy | conexion_adb | ok |
| web_backend | conexion_adb | ok |
| web_backend | equipos | ok |
| web_backend | sesiones_scrcpy | ok |
