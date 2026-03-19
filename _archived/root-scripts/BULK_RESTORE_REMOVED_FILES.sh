#!/bin/bash
# Bulk Restore Critical .removed Files
# This script batch-restores all .removed files in backend folder

echo "🔧 Starting bulk restoration of .removed files..."
echo ""

cd "backend" || exit 1

# Function to restore files in a directory
restore_directory() {
    local dir=$1
    local count=0

    if [ ! -d "$dir" ]; then
        echo "❌ Directory not found: $dir"
        return
    fi

    echo "📁 Processing: $dir/"

    for file in "$dir"/*.removed; do
        if [ -f "$file" ]; then
            new_name="${file%.removed}"
            mv "$file" "$new_name"
            echo "  ✅ $(basename "$new_name")"
            ((count++))
        fi
    done

    echo "  📊 Restored $count files in $dir"
    echo ""
}

# Restore middleware
restore_directory "middleware"

# Restore services
restore_directory "services"

# Restore models
restore_directory "models"

# Restore utils
restore_directory "utils"

# Restore config
restore_directory "config"

echo "✅ Restoration complete!"
echo ""
echo "🧪 Running tests to verify..."
npm test
