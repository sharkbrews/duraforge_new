$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..\..\..")
python ".\web\scripts\oem-kb\parse_markdown.py"
python ".\web\scripts\oem-kb\process_images.py"
python ".\web\scripts\oem-kb\build_search_index.py"
python ".\web\scripts\oem-kb\validate_import.py"
Set-Location ".\web"
node --env-file=.env --import tsx ".\scripts\oem-kb\import_knowledge_base.ts"
