# Zynerfilmer - agenda de agentes
| Agente | Responsabilidad | Alcance exclusivo |
|---|---|---|
| panel_AGENT | Panel web y alternativa WinForms | src/features/panel/** |
| conexion_adb_AGENT | IP/puerto, ADB multiplataforma | src/features/conexion_adb/** |
| equipos_AGENT | Catalogo persistente | src/features/equipos/** |
| sesiones_scrcpy_AGENT | Video y control scrcpy | src/features/sesiones_scrcpy/** |
| web_backend_AGENT | HTTP, WebSocket y acceso al panel | src/features/web_backend/** |
| desktop_electron_AGENT | Ventana Electron local/remota | src/features/desktop_electron/** |
| ARCHITECT_AGENT | Composicion, integracion, despliegue y contratos | Raiz, scripts y docs globales |

## Trabajo
Leer AGENTS.md y el README/CONTRACT/agente del modulo. Reservar tarea, archivos y responsable en docs/WORKBOARD.md antes de editar. Un editor por modulo.
Los especialistas solo consumen contratos publicos. No modifican archivos ajenos sin permiso escrito del propietario y arquitecto.
Solicitudes en docs/requests/ con motivo, rutas, impacto y pruebas. Silencio no autoriza; nadie autoaprueba. Si una sesion representa ambos roles, decide el usuario.
El permiso termina con su tarea y no transfiere propiedad. Registrar cambios y pruebas; liberar reserva al integrar.
## Estado
0.3 usa Electron/panel web y backend Node. Codigo C# 0.2 conservado como alternativa. No hay workers externos.
MIG-002 es una autorizacion transversal especifica del usuario; no elimina limites para trabajos futuros.
## Proximo paso
Despliegue real de CentOS con dominio/TLS y confianza ADB propia del servidor.
Las reglas son operativas; no bloquean tecnicamente escrituras fuera de alcance.

## Version 0.4
Equipos posee SQLite y migracion JSON. web_backend posee DELETE y acceso. panel posee popups/dropdowns. Arquitecto integra y prepara distribucion GitHub/mirmidon sin subir ni desplegar.

## AI-006
agentes_ia_AGENT posee src/features/agentes_ia/**: cuenta OAuth y conversaciones independientes por movil.
Panel consume HTTP, web_backend autentica y valida catalogo, arquitecto compone servicios y empaqueta.
Cada agente de movil mantiene preferencias, hilo e historial; todos usan la cuenta compartida configurada en esta instalacion.

## BOT-007
bot_tiktok_AGENT posee src/features/bot_tiktok/**: observacion y acciones Android acotadas, limites y ciclo de tarea.
agentes_ia conserva OAuth/modelos/esfuerzos e inferencia; sesiones_scrcpy conserva bloqueo de control manual; panel/HTTP consumen APIs publicas.
Repositorio futuro: https://github.com/miguelleonh0331/zynerfilmer (docs/REPOSITORY.md); sin publicacion automatica.

## BOT-008
Panel posee dropdown y estado global visual; bot_tiktok posee configuracion de tarea, reloj aleatorio y cierre con SLEEP; web_backend conserva validacion y exposicion del estado.
