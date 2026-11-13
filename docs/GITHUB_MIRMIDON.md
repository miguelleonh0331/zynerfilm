# Preparar GitHub e instalar en mirmidon
## Estado
El desarrollo esta versionado con Git. No se publica automaticamente ni se modifica el VPS.
El historial local incluye contexto de trabajo; para GitHub se exporta una instantanea limpia con su propio repositorio, sin reescribir el historial original.
## Exportacion
Con Node 24 y arbol Git limpio: node scripts/export-github.mjs
Salida: dist/github/zynerfilmer-VERSION-COMMIT/ (repo Git independiente) y ZIP del mismo nombre.
Se excluyen bases SQLite, WAL, claves, .env, runtime y reportes locales/solicitudes internas. No contiene equipos de produccion.
Comprobar README, contratos y RELEASE_SOURCE.json antes de publicar. Se recomienda repositorio privado.
## Publicacion posterior
Desde la carpeta exportada, crear el repositorio GitHub privado y subir main mediante GitHub CLI o la interfaz. La herramienta gh ya puede usarse con la cuenta configurada en este PC; esta tarea no crea repositorios ni hace push.
Ejemplo: gh repo create zynerfilmer --private --source . --remote origin --push
No publicar directamente el historial de la carpeta de trabajo si se desea omitir su contexto privado.
## Instalacion por Docker/Compose en mirmidon
Pendiente comprobar sistema operativo, arquitectura x64, Docker/Compose y alcance VPN desde el contenedor. No instalar sobre servicios o rutas existentes.
1. Clonar el nuevo GitHub en una ruta exclusiva, por ejemplo /opt/zynerfilmer, y fijar el commit/tag que se va a instalar.
2. Generar la configuracion: python3 scripts/configure.py --origin https://ORIGEN-REAL-DEL-PANEL
3. Revisar .env y preparar proxy HTTPS con deploy/nginx-location.conf. Mantener el puerto del backend solo en loopback.
4. Ejecutar docker compose up -d --build.
5. Comprobar docker compose ps, curl -fsS http://127.0.0.1:4317/api/health y logs del servicio.
6. Autorizar/vincular el ADB del contenedor con cada Android por VPN. Las claves ADB se conservan en su volumen, separado de la base.
7. Ingresar desde navegador HTTPS con la clave de .env y probar alta, miniatura, ampliacion y menu. La VPN no sustituye la autorizacion ADB.
Los volumenes zynerfilmer-data y zynerfilmer-adb conservan SQLite y confianza ADB. No usar docker compose down -v en actualizaciones.
## SQLite y migracion
Archivo activo: /data/zynerfilmer.sqlite en contenedor. Esquema automatico version 1: dispositivos con ID, endpoint unico, modelo y fechas; tabla migrations.
Si hay equipos.json en el directorio de datos, se importa solo una vez dentro de una transaccion. El JSON permanece intacto. Corregir JSON invalido antes de iniciar; no se omite silenciosamente.
Eliminar desde el menu quita el registro y su vista, no modifica datos Android. El registro no se reimporta al reiniciar.
La alternativa C# usa su JSON anterior; no comparte cambios posteriores con SQLite.
## Backup y restauracion
Backup consistente en vivo desde el contenedor:
docker compose exec zynerfilmer node scripts/database-backup.mjs /data/zynerfilmer.sqlite /data/backup-FECHA.sqlite
El destino debe ser nuevo. Copiar despues ese backup fuera del VPS/volumen.
Restaurar con el servicio detenido: conservar base y archivos WAL/SHM anteriores en carpeta de respaldo; restaurar el backup como zynerfilmer.sqlite con propietario correcto; arrancar y validar health, login y listado.
## Actualizar y revertir
Conservar .env y volumenes; hacer backup, fijar nuevo commit y ejecutar docker compose up -d --build.
Para revertir codigo, volver al commit anterior y reconstruir. Si cambia el esquema, restaurar tambien el backup compatible. No borrar volumenes ni tocar otros servicios de mirmidon.
## Pendiente
Este PC no tiene Docker: la plantilla y el instalador no equivalen a una instalacion verificada en mirmidon. No se cambiaron SSH, firewall, proxy ni servicios remotos.
