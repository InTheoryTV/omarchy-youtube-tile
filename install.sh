#!/usr/bin/env bash
# Install the unpacked extension and append it to Chromium's flag file.
# Does not remove other extensions. Does not change any other flag.
set -euo pipefail

root=$(cd "$(dirname "$0")" && pwd)
dest="$HOME/.config/omarchy/chromium/extensions/youtube-tile"
flags="$HOME/.config/chromium-flags.conf"

mkdir -p "$dest"
cp "$root/manifest.json" "$root/tile.css" "$root/tile.js" "$dest/"

if [[ ! -f "$flags" ]]; then
  printf '%s\n' "--load-extension=$dest" >"$flags"
elif grep -F -q -- "$dest" "$flags"; then
  :
elif grep -q '^--load-extension=' "$flags"; then
  sed -i "s|^--load-extension=\\(.*\\)|--load-extension=\\1,$dest|" "$flags"
else
  printf '%s\n' "--load-extension=$dest" >>"$flags"
fi

echo "Installed to $dest"
echo "Quit Chromium completely, then open the YouTube webapp."
echo "omarchy refresh chromium rewrites the flags file. Run this script again after that."
