import { escapeHtml, renderPage } from "./layout.js";

export type LoginPageInput = {
  csrfToken: string;
  error?: string;
};

export type RegisterPageInput = {
  csrfToken: string;
  error?: string;
};

export function renderLoginPage(input: LoginPageInput): string {
  const error = input.error
    ? `<p class="error" role="alert">${escapeHtml(input.error)}</p>`
    : "";

  return renderPage(
    "Log in",
    `<nav class="page-nav" aria-label="Primary"><a class="brand-link" href="/">KitchenWarden</a></nav>
  <p class="eyebrow">Account</p>
  <h1>Log in</h1>
  <p class="subtitle">Sign in with your username and password.</p>
  <article class="card">
    ${error}
    <form method="post" action="/auth/login">
      <input type="hidden" name="csrf_token" value="${escapeHtml(input.csrfToken)}">
      <label class="field">
        Username
        <input type="text" name="username" autocomplete="username" required>
      </label>
      <label class="field">
        Password
        <input type="password" name="password" autocomplete="current-password" required>
      </label>
      <button class="button" type="submit">Log in</button>
    </form>
  </article>
  <p class="page-action">No account yet? <a href="/auth/register">Register</a></p>`,
  );
}

export function renderRegisterPage(input: RegisterPageInput): string {
  throw new Error("renderRegisterPage is not implemented yet");
}
