import { escapeHtml, renderPage, versionedAssetUrl } from "./layout.js";

// The fields this page needs. The password hash never reaches a view.
export type AccountView = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
};

export type AccountPageInput = {
  user: AccountView;
  csrfToken: string;
  notice?: string;
  error?: string;
};

const CONFIRM_PASSWORD_JS = versionedAssetUrl("confirm-password.js", "aesthetics");

export function renderAccountPage(input: AccountPageInput): string {
  const { user } = input;
  const csrf = `<input type="hidden" name="csrf_token" value="${escapeHtml(input.csrfToken)}">`;
  const notice = input.notice ? `<p class="note" role="status">${escapeHtml(input.notice)}</p>` : "";
  const error = input.error ? `<p class="error" role="alert">${escapeHtml(input.error)}</p>` : "";
  const phone = user.phoneNumber ? escapeHtml(user.phoneNumber) : "Not set";

  return renderPage(
    "Account",
    `<p class="eyebrow">Account</p>
  <h1 class="capitalize">${escapeHtml(`${user.firstName} ${user.lastName}`)}</h1>
  ${notice}
  ${error}
  <div class="cards">
    <article class="card">
      <dl>
        <dt>Email</dt>
        <dd>${escapeHtml(user.email)}</dd>
        <dt>Phone</dt>
        <dd>${phone}</dd>
      </dl>
    </article>
    <article class="card">
      <h2>Change email</h2>
      <form method="post" action="/account/email">
        ${csrf}
        <label class="field">
          New email
          <input type="email" name="email" autocomplete="email" required>
        </label>
        <button class="button" type="submit">Save email</button>
      </form>
    </article>
    <article class="card">
      <h2>Change phone number</h2>
      <form method="post" action="/account/phone">
        ${csrf}
        <label class="field">
          Phone number (10 digits)
          <input type="tel" name="phone" autocomplete="tel-national" pattern="[2-9][0-9]{2}[2-9][0-9]{6}" title="Ten digits, for example 7036878555" required>
        </label>
        <button class="button" type="submit">Save phone number</button>
      </form>
    </article>
    <article class="card">
      <h2>Change password</h2>
      <form method="post" action="/account/password">
        ${csrf}
        <label class="field">
          Current password
          <input type="password" name="current_password" autocomplete="current-password" required>
        </label>
        <label class="field">
          New password
          <input type="password" id="password" name="new_password" autocomplete="new-password" minlength="12" maxlength="128" required>
        </label>
        <label class="field">
          Confirm new password
          <input type="password" id="confirm_password" name="confirm_password" autocomplete="new-password" minlength="12" maxlength="128" required>
        </label>
        <button class="button" type="submit">Change password</button>
      </form>
    </article>
    <article class="card">
      <h2>Delete account</h2>
      <form method="post" action="/account/delete">
        ${csrf}
        <label class="field">
          Password
          <input type="password" name="password" autocomplete="current-password" required>
        </label>
        <button class="button" type="submit">Delete account</button>
      </form>
    </article>
  </div>
  <script src="${CONFIRM_PASSWORD_JS}" defer></script>`,
    { csrfToken: input.csrfToken },
  );
}
