#!/usr/bin/env bash
# Copy the unpacked extension into place.
# Chromium gets it on the existing --load-extension line.
# A branded Chromium default (Brave, Chrome, Edge, and the others Omarchy
# launches webapps in) does not read that file, so print Load unpacked steps.
set -euo pipefail

root=$(cd "$(dirname "$0")" && pwd)
dest="$HOME/.config/omarchy/chromium/extensions/youtube-tile"
flags="$HOME/.config/chromium-flags.conf"
browser=$(xdg-settings get default-web-browser 2>/dev/null || true)

mkdir -p "$dest"
cp "$root/manifest.json" "$root/tile.css" "$root/tile.js" "$dest/"

extensions_page() {
  case $1 in
    google-chrome*) echo "chrome://extensions" ;;
    brave*) echo "brave://extensions" ;;
    microsoft-edge*) echo "edge://extensions" ;;
    opera*) echo "opera://extensions" ;;
    vivaldi*) echo "vivaldi://extensions" ;;
    helium*) echo "chrome://extensions" ;;
    *) echo "the browser's extensions page" ;;
  esac
}

branded=0
case $browser in
  google-chrome*|brave*|microsoft-edge*|opera*|vivaldi*|helium*) branded=1 ;;
esac

if (( branded )); then
  page=$(extensions_page "$browser")
  echo "Copied to $dest"
  echo "The default browser is $browser. It does not read ~/.config/chromium-flags.conf."
  echo "Open $page, turn on Developer mode, and choose Load unpacked."
  echo "Select $dest"
  echo "That load survives omarchy refresh chromium."
  exit 0
fi

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
