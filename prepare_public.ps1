# Build the standalone public Connect Four game without changing the private trainer.
param([string]$TrainingFolder = "..\four-ai")
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$TrainingFolder = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $TrainingFolder))
$python = Join-Path $TrainingFolder '.venv\Scripts\python.exe'
if (!(Test-Path $python)) { throw "Existing Python environment not found: $python" }
if (!(Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Node.js/npm is needed to build the NEW public website. Your Python trainer does not need reinstalling.' }
Write-Host '[1/3] Read-only export of saved historical AI models' -ForegroundColor Cyan
& $python '.\tools\export_models.py' '--source' $TrainingFolder
if ($LASTEXITCODE -ne 0) {throw 'Export failed. If missing onnx, run: <your four-ai .venv python> -m pip install onnx; then retry. No training data was touched.'}
Write-Host '[2/3] Install website-only JavaScript dependencies' -ForegroundColor Cyan
& npm install
if ($LASTEXITCODE -ne 0) {throw 'npm install failed. Check connectivity and dependency versions.'}
Write-Host '[3/3] Produce standalone static deployment in dist/' -ForegroundColor Cyan
& npm run build
if ($LASTEXITCODE -ne 0) {throw 'Web build failed. Nothing in your original four-ai installation was changed.'}
Write-Host 'Ready: deploy FOUR_public\dist to a separate Netlify site.' -ForegroundColor Green
