$ErrorActionPreference = 'Stop'
$exe = Join-Path $PSScriptRoot 'dist\Zynerfilmer\Zynerfilmer.exe'
foreach ($check in @('--self-test', '--ui-test', '--smoke')) {
    $process = Start-Process -FilePath $exe -ArgumentList $check -PassThru -WindowStyle Hidden
    if (!$process.WaitForExit(30000)) {
        $process.Kill()
        throw "Tiempo agotado: $check"
    }
    if ($process.ExitCode -ne 0) { throw "Fallo $check (codigo $($process.ExitCode))." }
    Write-Host "OK $check"
}
python "$PSScriptRoot\scripts\repo_agent.py" validate --repo $PSScriptRoot
if ($LASTEXITCODE -ne 0) { throw 'Documentacion invalida.' }
