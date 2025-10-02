#!/usr/bin/env bash
set -euo pipefail
root_dir="$(cd "$(dirname "$0")/.." && pwd)"
res_dir="$root_dir/android/app/src/main/res/xml"
if [ ! -d "$res_dir" ]; then
  exit 0
fi
find "$res_dir" -maxdepth 1 -type f -name 'config *.xml' -print0 | while IFS= read -r -d '' file; do
  echo "Removing duplicate config file: $file"
  rm "$file"
done
