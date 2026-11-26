import { renderPage } from "./layout.js";

export type PantryPageInput = {
  csrfToken: string;
};

// Stub. Adding and removing food items comes later, so the page shows only the empty state.
export function renderPantryPage(input: PantryPageInput): string {
  return renderPage(
    "Pantry",
    `<h1>Pantry</h1>
  <p class="subtitle">Adding and removing food items is coming soon.</p>`,
    { csrfToken: input.csrfToken },
  );
}
