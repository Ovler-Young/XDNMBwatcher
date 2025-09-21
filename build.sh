#!/bin/bash

DIR="frontend" # Directory to track
BUILD_FILE=".buildtime" # File to store last build time

# Remove the webpack build file if it exists. it's in dist of the current folder, not the frontend folder
if [ -f "dist/main.js" ]; then
    rm "dist/main.js"
fi
pnpm webpack

# Get the directory's last modified time in seconds since epoch
dir_mod_time=$(stat -c %Y "$DIR" 2>/dev/null || stat -f %m "$DIR" 2>/dev/null)

if [ -f "$BUILD_FILE" ]; then
    # Get the last build time
    build_time=$(cat "$BUILD_FILE")
    if [ "$dir_mod_time" -gt "$build_time" ]; then
        echo "Changes detected, building..."
        cd "$DIR" && pnpm install && pnpm build
        # Write the latest build time into the file
        cd - > /dev/null
        dir_mod_time=$(stat -c %Y "$DIR" 2>/dev/null || stat -f %m "$DIR" 2>/dev/null)
        echo "$dir_mod_time" > "$BUILD_FILE"
    else
        echo "No changes detected, skipping build."
    fi
else
    echo "First time building..."
    cd "$DIR" && pnpm install && pnpm build
    cd - > /dev/null
    dir_mod_time=$(stat -c %Y "$DIR" 2>/dev/null || stat -f %m "$DIR" 2>/dev/null)
    echo "$dir_mod_time" > "$BUILD_FILE"
fi