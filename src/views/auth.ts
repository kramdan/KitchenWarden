import { escapeHtml, renderPage, versionedAssetUrl } from "./layout.js";

export type LoginPageInput = {
  csrfToken: string;
  error?: string;
};

export type RegisterPageInput = {
  csrfToken: string;
  error?: string;
  // Kept on a failed submit, so the user does not retype them. Passwords are never returned.
  values?: { firstName?: string; lastName?: string; email?: string };
};

const CONFIRM_PASSWORD_JS = versionedAssetUrl("confirm-password.js", "aesthetics");

function errorBlock(error?: string): string {
  return error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : "";
}

export function renderLoginPage(input: LoginPageInput): string {
  return renderPage(
    "Log in",
    `<p class="eyebrow">Account</p>
  <h1>Log in</h1>
  <p class="subtitle">Sign in with your email and password.</p>
  <article class="card">
    ${errorBlock(input.error)}
    <form method="post" action="/auth/login">
      <input type="hidden" name="csrf_token" value="${escapeHtml(input.csrfToken)}">
      <label class="field">
        Email
        <input type="email" name="email" autocomplete="email" required>
      </label>
      <label class="field">
        Password
        <input type="password" name="password" autocomplete="current-password" required>
      </label>
      <button class="button" type="submit">Log in</button>
    </form>
  </article>
  <p class="page-action">No account yet? <a href="/auth/register">Sign up</a></p>`,
  );
}

export function renderRegisterPage(input: RegisterPageInput): string {
  const values = input.values ?? {};
  return renderPage(
    "Sign up",
    `<p class="eyebrow">Account</p>
  <h1>Sign up</h1>
  <p class="subtitle">Create your account with your name, email, and a password.</p>
  <article class="card">
    ${errorBlock(input.error)}
    <form method="post" action="/auth/register">
      <input type="hidden" name="csrf_token" value="${escapeHtml(input.csrfToken)}">
      <label class="field">
        First name
        <input type="text" name="first_name" autocomplete="given-name" pattern="[A-Za-z]+" title="Letters only" value="${escapeHtml(values.firstName ?? "")}" required>
      </label>
      <label class="field">
        Last name
        <input type="text" name="last_name" autocomplete="family-name" pattern="[A-Za-z]+" title="Letters only" value="${escapeHtml(values.lastName ?? "")}" required>
      </label>
      <label class="field">
        Email
        <input type="email" name="email" autocomplete="email" value="${escapeHtml(values.email ?? "")}" required>
      </label>
      <label class="field">
        Password
        <input type="password" id="password" name="password" autocomplete="new-password" minlength="12" maxlength="128" required>
      </label>
      <label class="field">
        Confirm password
        <input type="password" id="confirm_password" name="confirm_password" autocomplete="new-password" minlength="12" maxlength="128" required>
      </label>
      <button class="button" type="submit">Sign up</button>
    </form>
  </article>
  <p class="page-action">Already registered? <a href="/auth/login">Log in</a></p>
  <script src="${CONFIRM_PASSWORD_JS}" defer></script>`,
  );
}
