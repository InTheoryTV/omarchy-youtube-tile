# YouTube tile for Omarchy

Theater mode on the YouTube Chromium webapp becomes the video, and the picture follows the Omarchy tile when the window changes size.

Omarchy already opens YouTube as a webapp with **Super+Shift+Y**, or:

```bash
omarchy-launch-webapp https://youtube.com/
```

That window is a browser `--app` window on the same profile as the browser. The video-only fill runs there. A normal YouTube tab keeps the header, search, and scrolling. YouTube can still use its own theater layout in that tab.

This is the player. Captions stay on it. The CC button, the timeline, and the rest of the player controls still show on hover. It is not a picture-in-picture window.

## Theater mode

YouTube's theater control is the size button in the player (the rectangle icon). On a narrow tile YouTube hides that button, so a half window cannot enter theater. This extension keeps the button on screen.

Click it on a watch page:

- The header, guide, title, comments, chat, and related videos hide.
- The player is pinned to the window.
- The picture uses `object-fit: cover`, centered. A wide tile barely crops a 16:9 frame. A narrow or square tile zooms to the middle.
- Click the size button again and the normal watch page comes back.
- YouTube's fullscreen button is unchanged.

No Hyprland window rule. The fill is the viewport (`100vw` / `100vh`). Super+arrow, a drag on the tile edge, or any other resize changes the crop immediately.

If YouTube refuses to set its own theater attribute on a small player, the same click still fills the window.

The extension does not block ads. If one gets through, its layer stays above the picture instead of stuck underneath.

YouTube changes its page markup. When theater stops filling the window, the selectors in `tile.css` and `tile.js` are what to update.

## Install

```bash
./install.sh
```

The script copies the extension to `~/.config/omarchy/chromium/extensions/youtube-tile`. Omarchy opens the webapp in the default browser. When that browser is Chromium, or anything Omarchy falls back to Chromium for, the script appends the extension to the existing `--load-extension=` line in `~/.config/chromium-flags.conf`. It does not replace the file or remove other extensions.

Quit Chromium completely after that. A reload of a YouTube tab is not enough, because the running process keeps its old flag list. Webapp windows are that same process.

`omarchy refresh chromium` rewrites the flags file from Omarchy's defaults and drops the extra path. Run `install.sh` again after a refresh.

Brave, Chrome, Edge, Opera, Vivaldi, and Helium do not read Chromium's flag file, and those builds often ignore `--load-extension`. If one of them is the default browser, `install.sh` leaves the flags file alone and prints the manual step: open the browser's extensions page, turn on Developer mode, and choose Load unpacked on the copied folder. Brave's page is `brave://extensions`. That load survives `omarchy refresh chromium`.

## Ads

Ads are a separate extension: [uBlock Origin Lite](https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh) by Raymond Hill. Current Chromium loads this Manifest V3 build.

Install it from the Chrome Web Store in the same Chromium profile the webapp uses, then set the default filtering mode to **Complete**. The YouTube webapp picks that up because it is not a separate browser profile.

To set Complete as the machine default, copy the policy and restart Chromium:

```bash
sudo mkdir -p /etc/chromium/policies/managed
sudo cp policies/ublock-origin-lite.json /etc/chromium/policies/managed/
```

`installation_mode` is `normal_installed`, so the extension can still be turned off. Per-site mode can still be changed. Removing `defaultFiltering` from that file and restarting Chromium unlocks the global slider.

A YouTube Premium sign-in also removes ads. This policy does not check for that.

## Left out

Codec choice and hardware decoding stay with Chromium and YouTube. This repo does not ship a codec extension or browser flags for a particular GPU.
