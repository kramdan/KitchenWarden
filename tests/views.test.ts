import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderAccountLink, renderPage } from "../src/views/layout.js";
import { renderLoginPage, renderRegisterPage } from "../src/views/auth.js";
import { renderAccountPage } from "../src/views/account.js";

const RAW_SCRIPT = "<script>alert(1)</script>";
const ESCAPED_SCRIPT = "&lt;script&gt;alert(1)&lt;/script&gt;";

describe("view escaping", () => {
  it("escapes an error message on the login page", () => {
    const html = renderLoginPage({ csrfToken: "csrf-test", error: RAW_SCRIPT });
    assert.ok(html.includes(ESCAPED_SCRIPT));
    assert.ok(!html.includes(RAW_SCRIPT));
  });

  it("escapes typed values on the register page", () => {
    const html = renderRegisterPage({
      csrfToken: "csrf-test",
      values: { firstName: RAW_SCRIPT, lastName: "lovelace", email: "ada@example.test" },
    });
    assert.ok(html.includes(ESCAPED_SCRIPT));
    assert.ok(!html.includes(RAW_SCRIPT));
  });

  it("escapes the account holder's name on the account page", () => {
    const html = renderAccountPage({
      user: { firstName: RAW_SCRIPT, lastName: "lovelace", email: "ada@example.test", phoneNumber: null },
      csrfToken: "csrf-test",
    });
    assert.ok(html.includes(ESCAPED_SCRIPT));
    assert.ok(!html.includes(RAW_SCRIPT));
  });

  it("escapes the display name in the account link", () => {
    const html = renderAccountLink(RAW_SCRIPT);
    assert.ok(html.includes(ESCAPED_SCRIPT));
    assert.ok(!html.includes(RAW_SCRIPT));
  });
});

describe("register page", () => {
  it("keeps the typed first name, last name, and email when it re-renders with an error", () => {
    const html = renderRegisterPage({
      csrfToken: "csrf-test",
      error: "Passwords do not match.",
      values: { firstName: "ada", lastName: "lovelace", email: "ada@example.test" },
    });
    assert.match(html, /name="first_name"[^>]*value="ada"/);
    assert.match(html, /name="last_name"[^>]*value="lovelace"/);
    assert.match(html, /name="email"[^>]*value="ada@example\.test"/);
  });

  it("includes confirm-password.js with a content-hash version", () => {
    const html = renderRegisterPage({ csrfToken: "csrf-test" });
    assert.match(html, /<script src="\/assets\/confirm-password\.js\?v=[0-9a-f]{12}" defer><\/script>/);
  });
});

describe("account page", () => {
  it("renders no password hash when given only the account view fields", () => {
    const html = renderAccountPage({
      user: { firstName: "ada", lastName: "lovelace", email: "ada@example.test", phoneNumber: null },
      csrfToken: "csrf-test",
    });
    assert.ok(!html.includes("$argon2"));
  });
});

describe("navigation menu", () => {
  it("omits the Sign out form and Account link when no nav is given", () => {
    const html = renderPage("Test", "<p>Body</p>");
    assert.ok(!html.includes("Sign out"));
    assert.ok(!html.includes('href="/account"'));
  });

  it("shows the Account link and Sign out when a nav is given", () => {
    const html = renderPage("Test", "<p>Body</p>", { csrfToken: "csrf-test" });
    assert.ok(html.includes("Sign out"));
    assert.ok(html.includes('href="/account"'));
  });
});
