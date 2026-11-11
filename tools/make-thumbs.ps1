<#
  Makes fast-loading copies of every poster and game cover.

    images/posters/bb.jpg  ->  images/thumbs/posters/bb.jpg   (360px wide, for grids and rows)
                           ->  images/large/posters/bb.jpg    (900px wide, for the title page)

  The originals are never touched. Images that already have up-to-date copies are skipped,
  so it's quick to run again after adding new posters. If a copy is missing, the site
  just falls back to the original image, so nothing breaks if you forget to run this.

  Run it: right-click this file > "Run with PowerShell"
     or:  powershell -ExecutionPolicy Bypass -File tools\make-thumbs.ps1
#>

param(
    [int]$SmallWidth = 360,
    [int]$LargeWidth = 900,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore

$root = Split-Path -Parent $PSScriptRoot
$sources = @('posters', 'games')
$extensions = '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.avif'

function Get-PixelWidth([string]$path) {
    $stream = [IO.File]::OpenRead($path)
    try {
        $decoder = [System.Windows.Media.Imaging.BitmapDecoder]::Create(
            $stream,
            [System.Windows.Media.Imaging.BitmapCreateOptions]::DelayCreation,
            [System.Windows.Media.Imaging.BitmapCacheOption]::None)
        return $decoder.Frames[0].PixelWidth
    } finally {
        $stream.Dispose()
    }
}

function Save-Resized([string]$src, [string]$dst, [int]$width, [int]$quality) {
    $original = Get-PixelWidth $src
    if ($original -le 2) { throw "Windows can't decode this format" }

    $bitmap = New-Object System.Windows.Media.Imaging.BitmapImage
    $bitmap.BeginInit()
    $bitmap.UriSource = New-Object Uri($src)
    $bitmap.CacheOption = [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad
    if ($original -gt $width) { $bitmap.DecodePixelWidth = $width }   # never upscale
    $bitmap.EndInit()

    if ($bitmap.PixelWidth -le 2) { throw "Windows can't decode this format" }

    $rgb = New-Object System.Windows.Media.Imaging.FormatConvertedBitmap
    $rgb.BeginInit()
    $rgb.Source = $bitmap
    $rgb.DestinationFormat = [System.Windows.Media.PixelFormats]::Bgr24
    $rgb.EndInit()

    $encoder = New-Object System.Windows.Media.Imaging.JpegBitmapEncoder
    $encoder.QualityLevel = $quality
    $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($rgb))

    New-Item -ItemType Directory -Force (Split-Path -Parent $dst) | Out-Null
    $out = [IO.File]::Create($dst)
    try { $encoder.Save($out) } finally { $out.Dispose() }
}

$made = 0; $skipped = 0; $failed = @()

foreach ($folder in $sources) {
    $dir = Join-Path $root "images\$folder"
    if (-not (Test-Path $dir)) { continue }

    $files = Get-ChildItem $dir -File | Where-Object { $extensions -contains $_.Extension.ToLower() }

    # Two originals with the same name but different extensions would share one copy
    $files | Group-Object BaseName | Where-Object Count -gt 1 | ForEach-Object {
        Write-Warning "images/$folder has more than one '$($_.Name).*' file; only one gets a copy."
    }

    foreach ($file in $files) {
        $targets = @(
            @{ Path = Join-Path $root "images\thumbs\$folder\$($file.BaseName).jpg"; Width = $SmallWidth; Quality = 80 },
            @{ Path = Join-Path $root "images\large\$folder\$($file.BaseName).jpg";  Width = $LargeWidth; Quality = 84 }
        )
        foreach ($t in $targets) {
            if (-not $Force -and (Test-Path $t.Path) -and (Get-Item $t.Path).LastWriteTime -ge $file.LastWriteTime) {
                $skipped++
                continue
            }
            try {
                Save-Resized $file.FullName $t.Path $t.Width $t.Quality
                $made++
            } catch {
                if ($file.Length -le 400KB) {
                    # Already small (often an AVIF/WebP Windows can't read): browsers can show it as-is
                    New-Item -ItemType Directory -Force (Split-Path -Parent $t.Path) | Out-Null
                    Copy-Item $file.FullName $t.Path -Force
                    $made++
                } else {
                    $failed += "images/$folder/$($file.Name)  ($($_.Exception.Message))"
                    break
                }
            }
        }
    }
}

Write-Host ""
Write-Host "Made $made image copies, $skipped already up to date." -ForegroundColor Green
if ($failed.Count) {
    Write-Host "Couldn't convert these (the site will use the original file instead):" -ForegroundColor Yellow
    $failed | Sort-Object -Unique | ForEach-Object { Write-Host "  $_" }
}

$small = Get-ChildItem (Join-Path $root 'images\thumbs') -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum
$large = Get-ChildItem (Join-Path $root 'images\large') -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum
Write-Host ("Small copies: {0} files, {1:N1} MB   Large copies: {2} files, {3:N1} MB" -f $small.Count, ($small.Sum / 1MB), $large.Count, ($large.Sum / 1MB))

# Keep the window open when started with right-click > Run with PowerShell
if (-not [Console]::IsInputRedirected) {
    Write-Host ""
    Read-Host "Done. Press Enter to close" | Out-Null
}
