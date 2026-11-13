# CONTRACT.md - desktop_electron
## Responsabilidad contractual
Cliente de escritorio Electron para el panel web.
## Version
0.3 JavaScript. Las APIs C# 0.2 permanecen para la alternativa clasica.
## Entradas publicas
api/main.cjs arranca Electron. Modo local: llama a la composicion raiz server.mjs con puerto libre y auto-login. Modo remoto: ZYNER_SERVER_URL apunta al panel HTTPS, sin iniciar ADB local.
## Salidas publicas
Electron 45.3.1. nodeIntegration=false, contextIsolation=true, sandbox=true. Niega ventanas emergentes, permisos y navegacion fuera del origen. Al cerrar, termina su backend y sesiones propias. Modo servidor funciona sin Electron.
## Errores posibles
Errores de validacion, conexion, autorizacion, codec, timeout o sistema se comunican al consumidor; no equivalen a ausencia de equipo.
## Dependencias permitidas
- web_backend
- panel
## Dependencias prohibidas
- Implementacion interna de otro modulo.
- Dependencias externas no aprobadas por el arquitecto.
## Garantias
Electron 45.3.1. nodeIntegration=false, contextIsolation=true, sandbox=true. Niega ventanas emergentes, permisos y navegacion fuera del origen. Al cerrar, termina su backend y sesiones propias. Modo servidor funciona sin Electron.
## Prohibiciones
No ejecutar ADB directamente, desactivar sandbox ni conceder Node al renderer.
## Cambios de contrato
Escalar al ARCHITECT_AGENT, evaluar consumidores, obtener permiso escrito y registrar decision e impacto antes de implementar. No autoaprobar invasiones.

## Actualizacion 0.5 / AI-006
Permite abrir exclusivamente https://auth.openai.com/codex/device en navegador del sistema desde nuevo enlace.
El resto de ventanas externas siguen denegadas. No altera la sesion OAuth del gestor de perfiles externo.
