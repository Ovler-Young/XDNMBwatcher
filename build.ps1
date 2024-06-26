$DIR = "frontend" # 需要追踪的目录
$BUILD_FILE = ".buildtime" # 用于存储上次构建时间的文件


# remove the webpack build file if it exists. it's in dist of the current folder, not the frontend folder
if (Test-Path "dist\main.js") {
    Remove-Item "dist\main.js"
}
pnpm webpack 


# Get the directory's last modified time in ticks
$dir_mod_time = (Get-Item $DIR).LastWriteTimeUtc.Ticks

if (Test-Path $BUILD_FILE) {
    # Get the last build time
    $build_time = [IO.File]::ReadAllText($BUILD_FILE)
    if ($dir_mod_time -gt $build_time) {
        Write-Output "Changes detected, building..."
        Set-Location $DIR ; pnpm install ; pnpm build
        # Write the latest build time into the file
        Set-Location $PSScriptRoot
        $dir_mod_time = (Get-Item $DIR).LastWriteTimeUtc.Ticks
        [IO.File]::WriteAllText($BUILD_FILE, $dir_mod_time)
    } else {
        Write-Output "No changes detected, skipping build."
    }
} else {
    Write-Output "First time building..."
    Set-Location $DIR ; pnpm install ; pnpm build
    Set-Location $PSScriptRoot
    $dir_mod_time = (Get-Item $DIR).LastWriteTimeUtc.Ticks
    [IO.File]::WriteAllText($BUILD_FILE, $dir_mod_time)
}