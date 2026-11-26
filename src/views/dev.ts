import { escapeHtml, renderPage } from "./layout.js";

// Dev-only pages. These are served only when dev tools are enabled.
export function renderDevResetPage(input: { csrfToken: string }): string {
  return renderPage(
    "Dev Reset",
    `<h1>Dev reset</h1>
  <p class="subtitle">This deletes every user account.</p>
  <form method="post" action="/reset">
    <input type="hidden" name="csrf_token" value="${escapeHtml(input.csrfToken)}">
    <button class="button" type="submit">Delete all users</button>
  </form>`,
  );
}

export function renderDevResetResultPage(deleted: boolean): string {
  const message = deleted ? "All users have been deleted." : "There were no users to delete.";
  return renderPage(
    "Dev Reset",
    `<h1>Dev reset</h1>
  <p class="subtitle">${message}</p>
  <p class="page-action">
    <a class="button" href="/reset">Back</a>
  </p>`,
  );
}
