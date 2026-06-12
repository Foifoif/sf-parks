# SF Parks Explorer

An interactive map for first-time San Francisco visitors — 32 parks, each with
real-layout boundaries, trails, and points of interest, rendered in three
switchable styles over one shared data model:

- **Classic** — 2.5D hand-drawn illustrated style with ocean life; spin, tilt and zoom
- **Real real** — Leaflet + OpenStreetMap tiles, locked to SF
- **Topographic-ish** — blocky extruded terrain showing each park's real elevation; spin, tilt and zoom

Pure static site: no build step, no framework, ES modules + CDN Leaflet.

## Structure

| File | Role |
|---|---|
| `index.html` | Shell, styles, chrome |
| `app.js` | App state, panels, browse list, style toggle |
| `parks-data.js` | Renderer-agnostic park data (geo bbox + relative coords) |
| `svg-renderer-core.js` | Shared SVG scene (projection/palette parameterized) |
| `renderer-isometric.js` / `renderer-voxel.js` | Thin wrappers over the SVG core |
| `renderer-leaflet.js` | OSM tile renderer from the same data |

## Develop

Serve the folder with any static server, e.g.:

```bash
npx http-server -p 8123
```

## Deploy

Cloudflare Pages, Git-connected: push to `main` → auto-deploy.
No build command; output directory `/`.
