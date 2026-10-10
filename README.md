# YouTube tile for Omarchy

Theater mode on the YouTube Chromium webapp becomes the video, and the picture follows the Omarchy tile when the window changes size.

Omarchy already opens YouTube as a webapp with **Super+Shift+Y**, or:

```bash
omarchy-launch-webapp https://youtube.com/
```

That window is Chromium `--app` on the same profile as the browser. An extension loaded there applies to the webapp and to a normal YouTube tab.

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

Chromium reads `~/.config/chromium-flags.conf` at startup. Omarchy's copy already has a `--load-extension=` line for its own extensions. Add this one to that line. Do not replace the file.

```bash
./install.sh
```

The script copies the extension to `~/.config/omarchy/chromium/extensions/youtube-tile` and appends that path. Then quit Chromium completely. A reload of the YouTube tab is not enough, because the running process keeps its old flag list. Webapp windows are that same process.

`omarchy refresh chromium` rewrites the flags file from Omarchy's defaults and drops the extra path. Run `install.sh` again after a refresh.

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
