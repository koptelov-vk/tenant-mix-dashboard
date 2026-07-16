$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$credentialPath = Join-Path $root ".codex\secrets\beget-credential.xml"
if (-not (Test-Path -LiteralPath $credentialPath)) {
    throw "Beget credential file is missing: $credentialPath"
}

$credential = Import-Clixml -LiteralPath $credentialPath
$env:BEGET_USER = $credential.UserName
$env:BEGET_PASS = $credential.GetNetworkCredential().Password

$python = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if (-not (Test-Path -LiteralPath $python)) {
    throw "Codex Python runtime is missing: $python"
}

try {
    & $python (Join-Path $PSScriptRoot "upload_beget_dashboard.py")
    if ($LASTEXITCODE -ne 0) {
        throw "Dashboard upload failed with exit code $LASTEXITCODE"
    }
}
finally {
    Remove-Item Env:BEGET_USER -ErrorAction SilentlyContinue
    Remove-Item Env:BEGET_PASS -ErrorAction SilentlyContinue
}
