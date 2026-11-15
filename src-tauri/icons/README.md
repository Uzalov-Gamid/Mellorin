# Icon source

`icon-source.svg` is the source artwork. Render at 1024 px with Quick Look (its SVG renderer preserves transforms), remove the white thumbnail canvas outside the paper tile, and force 8-bit RGBA before generating the bundle assets:

```sh
qlmanage -t -s 1024 -o /tmp icon-source.svg
magick /tmp/icon-source.svg.png -transparent white -depth 8 PNG32:/tmp/mellorin-icon.png
npx tauri icon /tmp/mellorin-icon.png -o /tmp/mellorin-icons
```

Copy the six existing bundle assets from that output into this directory. Run `python3 scripts/check_icons.py` from the repository root and launch the built macOS app before merging.
