# Procedencia y avisos

El motor scrcpy 3.3.4 (cliente y servidor), ADB y DLL se copiaron sin modificar del paquete local indicado en motor-origen.json. El manifiesto registra SHA-256 de cada archivo, comprobado contra el original. scrcpy usa Apache 2.0; SDL2 usa zlib; libusb usa LGPL 2.1; FFmpeg usa LGPL o GPL según su configuración de compilación. Se incluyen textos de licencia de los proyectos correspondientes. La configuración exacta de las DLL FFmpeg del paquete local no fue auditada; antes de redistribuir públicamente, comprobar las obligaciones y el código fuente correspondiente de todas las dependencias. ADB pertenece al proyecto Android Open Source Project (Apache 2.0 y avisos de sus dependencias).

Fuentes: https://github.com/Genymobile/scrcpy/tree/v3.3.4, https://github.com/libsdl-org/SDL/tree/release-2.32.8, https://github.com/libusb/libusb/tree/v1.0.29, https://ffmpeg.org/legal.html y https://android.googlesource.com/platform/packages/modules/adb/.

La interfaz Android Piloto es código nuevo y usa el runtime .NET de Microsoft, cuyos avisos se incluyen aparte. No es un producto oficial de Genymobile.

NAudio.Wasapi 2.3.0 y NAudio.Core 2.3.0: MIT; licencia incluida en NAudio-MIT.txt. Captura WASAPI compartida, sin modificar la configuración de entrada del sistema. Fuentes: https://github.com/naudio/NAudio/tree/v2.3.0. Versiones y hashes de paquetes en packages.lock.json.
