$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    $node = (Get-Command node -ErrorAction SilentlyContinue).Source
    if (!$node -or [int]((& $node --version).TrimStart('v').Split('.')[0]) -lt 24) {
        $node = 'D:\rea\.local\node-v24.21.0-win-x64\node.exe'
    }
    if (!(Test-Path -LiteralPath $node)) { throw 'Se requiere Node.js 24 o superior.' }
    $env:PATH = (Split-Path $node) + ';' + $env:PATH
    npm ci --no-fund --no-audit
    if ($LASTEXITCODE -ne 0) { throw 'Fallo npm ci.' }
    & $node node_modules/electron/install.js
    if ($LASTEXITCODE -ne 0) { throw 'Fallo descarga Electron.' }
    npm test
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron pruebas.' }
    npm run package:win
    if ($LASTEXITCODE -ne 0) { throw 'Fallo empaquetado.' }
    Write-Host 'Listo: dist\electron\Zynerfilmer-win32-x64\Zynerfilmer.exe'
} finally { Pop-Location }
