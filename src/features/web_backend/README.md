# web_backend
## Responsabilidad
Servidor HTTP/WebSocket y autorizacion del panel.
## Estado
Implementado para Zynerfilmer 0.3. Los archivos C# de 0.2 se conservan como alternativa y no se usan en Electron.
## API
index.mjs exporta accessToken(dataDir, supplied) y createWebServer({adb,store,sessions,token,webDir,host,port,publicOrigin,secureCookies}). Devuelve origin, server, close(). Composicion en server.mjs.
## Propietario
agents/web_backend_AGENT.md. Editar solo src/features/web_backend/** despues de reservar.
## Verificacion
npm test desde raiz; prueba de video real documentada en docs/VERIFICATION.md.
Para cambios de contratos o de otros modulos: solicitar permiso escrito al arquitecto y propietario.
