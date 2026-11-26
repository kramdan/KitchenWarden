import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ASSETS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
const AESTHETICS_DIR = join(dirname(fileURLToPath(import.meta.url)), "aesthetics");

// The URL carries a hash of the file contents, so a changed stylesheet gets a new URL
// and browsers do not keep serving the old one. Read once at startup; a missing file
// stops the app at startup rather than failing on the first page.
export function versionedAssetUrl(file: string, mount: "assets" | "aesthetics" = "assets"): string {
  const dir = mount === "assets" ? ASSETS_DIR : AESTHETICS_DIR;
  const hash = createHash("sha256")
    .update(readFileSync(join(dir, file)))
    .digest("hex")
    .slice(0, 12);
  return `/${mount === "assets" ? "assets" : "assets/aesthetics"}/${file}?v=${hash}`;
}

const RESET_CSS_URL = versionedAssetUrl("styles/reset.css");
const STYLES_CSS_URL = versionedAssetUrl("styles/styles.css");

// Menu data for a signed-in user. Pages rendered without it show only the brand.
export type SignedInNav = { csrfToken: string };

function renderHeader(nav?: SignedInNav): string {
  const brand = '<a class="brand-link" href="/">KitchenWarden</a>';
  if (!nav) {
    return `<nav class="page-nav" aria-label="Primary">${brand}</nav>`;
  }
  return `<nav class="page-nav" aria-label="Primary">${brand}
      <details class="menu">
        <summary class="menu-toggle" aria-label="Menu">&#9776;</summary>
        <div class="menu-panel">
          <a href="/account">Account</a>
          <a href="/pantry">Pantry</a>
          <form method="post" action="/auth/logout">
            <input type="hidden" name="csrf_token" value="${escapeHtml(nav.csrfToken)}">
            <button class="menu-item" type="submit">Sign out</button>
          </form>
        </div>
      </details>
    </nav>`;
}

export function renderPage(title: string, body: string, nav?: SignedInNav): string {
  const documentTitle =
    title === "Kitchen Warden" ? title : `${title} - Kitchen Warden`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(documentTitle)}</title>
    <link rel="stylesheet" href="${RESET_CSS_URL}">
    <link rel="stylesheet" href="${STYLES_CSS_URL}">
  </head>
  <body>
    ${renderHeader(nav)}
    <main>
      ${body}
    </main>
  </body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderAccountLink(displayName: string): string {
  return `<a href="/account">Hello, ${escapeHtml(displayName)}</a>`;
}
