# desktop_electron
## Responsabilidad
Cliente de escritorio Electron para el panel web.
## Estado
Implementado para Zynerfilmer 0.3. Los archivos C# de 0.2 se conservan como alternativa y no se usan en Electron.
## API
api/main.cjs arranca Electron. Modo local: llama a la composicion raiz server.mjs con puerto libre y auto-login. Modo remoto: ZYNER_SERVER_URL apunta al panel HTTPS, sin iniciar ADB local.
## Propietario
agents/desktop_electron_AGENT.md. Editar solo src/features/desktop_electron/** despues de reservar.
## Verificacion
npm test desde raiz; prueba de video real documentada en docs/VERIFICATION.md.
Para cambios de contratos o de otros modulos: solicitar permiso escrito al arquitecto y propietario.
