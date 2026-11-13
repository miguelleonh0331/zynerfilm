$ErrorActionPreference = 'Stop'
$sdk = Join-Path $env:LOCALAPPDATA 'REA-Tools\dotnet\dotnet.exe'
if (!(Test-Path -LiteralPath $sdk)) { $sdk = (Get-Command dotnet -ErrorAction Stop).Source }
& $sdk publish "$PSScriptRoot\Zynerfilmer.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true --output "$PSScriptRoot\dist\Zynerfilmer" --nologo
if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación.' }
Copy-Item -LiteralPath "$PSScriptRoot\motor" -Destination "$PSScriptRoot\dist\Zynerfilmer" -Recurse -Force
Copy-Item -LiteralPath "$PSScriptRoot\LICENSES" -Destination "$PSScriptRoot\dist\Zynerfilmer" -Recurse -Force
Copy-Item -LiteralPath "$PSScriptRoot\README.md" -Destination "$PSScriptRoot\dist\Zynerfilmer\LEEME.md"
