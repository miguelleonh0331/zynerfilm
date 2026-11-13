# panel
## Responsabilidad
Interfaz web compartida por navegador y Electron.
## Estado
Implementado para Zynerfilmer 0.3. Los archivos C# de 0.2 se conservan como alternativa y no se usan en Electron.
## API
web/index.html, style.css y app.js. Consume API HTTP y WebSocket del backend. Se preserva api/Panel.cs para la alternativa WinForms 0.2.
## Propietario
agents/panel_AGENT.md. Editar solo src/features/panel/** despues de reservar.
## Verificacion
npm test desde raiz; prueba de video real documentada en docs/VERIFICATION.md.
Para cambios de contratos o de otros modulos: solicitar permiso escrito al arquitecto y propietario.
## Cuadricula y ampliacion
Sidebar: agregar IP/puerto y listar disponibles. Derecha: una miniatura por equipo.
Click amplia sin abrir otra sesion; Volver/Escape devuelve a miniatura. Solo pantalla ampliada admite entradas remotas.
Prueba UI: tests/grid.check.js se ejecuta en pagina autenticada mediante agent-browser eval -b BASE64_DEL_ARCHIVO. Usa dos streams/decoders simulados, sin acciones en telefono real.
