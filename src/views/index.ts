import { renderPage } from "./layout.js";

// The home page is for anonymous visitors only. Signed-in users are redirected to /account.
export function renderIndexPage(): string {
  return renderPage(
    "Kitchen Warden",
    `<h1>KitchenWarden</h1>
  <p class="subtitle">Local kitchen inventory and meal planning.</p>
  <p class="page-action">
    <a class="button" href="/auth/login">Log in</a>
    <a class="button" href="/auth/register">Sign up</a>
  </p>`,
  );
}
