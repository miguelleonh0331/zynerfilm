# AGENTS.md - Zynerfilmer
## Objetivo
Controlar Android desde Windows por ADB Wi-Fi y scrcpy. Ver agend.md para responsabilidades.
## Reglas
1. Identificar y reservar modulo antes de editar; leer su README, CONTRACT y agente.
2. Especialistas editan solo src/features/<modulo>/**. Un unico editor por modulo.
3. Otra ruta requiere permiso escrito del propietario y ARCHITECT_AGENT, con rutas exactas en docs/requests/. Silencio no autoriza.
4. Consumir solo api/ de otros modulos; nunca services/, tests/ ni modelos privados.
5. Cambiar contratos, dependencias, stack o datos compartidos requiere escalar al arquitecto y registrar impacto.
6. Program.cs, SelfChecks.cs, csproj, scripts, motor, licencias y documentacion global pertenecen al arquitecto.
7. DECISIONS.md y CHANGELOG_AGENT.md son append-only; usar repo_agent.py y serializar escrituras.
8. MODULE_MAP.md es autogenerado; usar repo_agent.py map.
9. No autoaprobar permisos para invadir modulos; si una sola sesion representa ambos roles, requiere autorizacion del usuario.
10. Preservar cambios preexistentes, claves y datos privados; nunca registrar codigos de vinculacion.
11. No cerrar scrcpy ajeno ni apagar servidor ADB compartido.
## Estado
Los seis modulos estan implementados. La composicion activa se realiza en server.mjs; Program.cs conserva la alternativa C#.
La migracion inicial tuvo autorizacion del usuario; no concede permisos permanentes fuera del modulo.
Las reglas son operativas; no existe aislamiento automatico de archivos.

## Actualizacion 0.3
Activo: Electron + panel web + backend Node. Composicion raiz en server.mjs; C# 0.2 conservado.
Nuevos propietarios: web_backend y desktop_electron, ver agend.md.
La prueba de migracion MIG-002 tiene permiso transversal del usuario. Al cerrarse se restituyen alcances exclusivos.
Solo el arquitecto modifica package.json/lock, server.mjs, Dockerfile/compose, deploy/, scripts y pruebas de integracion en tests/.
No usar claves ni datos personales en fixtures, logs o Git; verification/ permanece local.

## Actualizacion 0.4
Node 24 y SQLite integrado. El modulo equipos es propietario exclusivo de esquema, migracion y persistencia.
No versionar SQLite/WAL/SHM, backups, .env, access-token ni claves ADB.
DATA-004 autoriza solo popup/dropdown, SQLite y preparacion GitHub/VPS. No autoriza publicacion ni cambios remotos.
La distribucion limpia se genera con scripts/export-github.mjs. Mantener historial local sin reescritura.

## AI-006 / 0.5
Usuario autoriza Configuracion OAuth y agente independiente por movil. agentes_ia posee cuenta Codex propia y contexto por endpoint. Las credenciales del gestor fuente no se copian. Alcance transversal documentado en docs/requests/AI-006.md; permiso termina al integrar. Sin acciones autonomas Android en esta fase.

## BOT-007 / 0.6
Usuario solicita construir bot TikTok y escoger modelo/esfuerzo. Alcance transversal registrado en docs/requests/BOT-007.md.
Nuevo propietario bot_tiktok. Es el unico adaptador autorizado para captura/verificacion/tap/swipe fijos de su tarea.
Nadie agrega comandos libres ni comparte contexto de moviles. Las pruebas de esta entrega no dan likes reales.
Repositorio de fuente futuro indicado por usuario en docs/REPOSITORY.md; origin preparado, sin push.

BOT-007 prueba fisica: usuario autoriza scroll/like en IP-TAILSCALE:PUERTO tras abrir TikTok. Esta autorizacion reemplaza la limitacion de solo simulacion para esa prueba acotada. No publicar fuente ni modificar otros equipos.

## BOT-008
Usuario autoriza dropdown, indicador verde, variacion temporal y bloqueo al completar. Alcance transversal en docs/requests/BOT-008.md. Solo comando fijo SLEEP 223; no configurar seguridad Android ni publicar fuente.
