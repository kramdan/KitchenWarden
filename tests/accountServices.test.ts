import { beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { User } from "../src/lib/db/schema.js";
import type { NewAccount } from "../src/lib/services/accountServices.js";

// In-memory answers for the query modules. Tests set these fields before calling a service.
type State = {
  byEmail?: User;
  byName?: User;
  created?: User;
  writeError?: unknown;
};
const state: State = {};

const getUser = mock.fn(async (_firstName: string, _lastName: string) => state.byName);
const getUserByEmail = mock.fn(async (_email: string) => state.byEmail);
const createUser = mock.fn(
  async (_firstName: string, _lastName: string, _email: string, _password: string) => state.created,
);
const setEmail = mock.fn(async (user: User, email: string) => {
  if (state.writeError) {
    throw state.writeError;
  }
  return { ...user, email };
});
const setPhone = mock.fn(async (user: User, phoneNumber: string) => {
  if (state.writeError) {
    throw state.writeError;
  }
  return { ...user, phoneNumber };
});
const setPassword = mock.fn(async (_user: User, _password: string) => {});
const deleteUsers = mock.fn(async (_user: User) => {});

mock.module("../src/lib/db/queries/userget.js", { exports: { getUser, getUserByEmail } });
mock.module("../src/lib/db/queries/users.js", { exports: { createUser } });
mock.module("../src/lib/db/queries/setEmail.js", { exports: { setEmail } });
mock.module("../src/lib/db/queries/setPhone.js", { exports: { setPhone } });
mock.module("../src/lib/db/queries/setPassword.js", { exports: { setPassword } });
mock.module("../src/lib/db/queries/userdelete.js", { exports: { deleteUsers } });

const {
  AccountError,
  authenticate,
  changeEmail,
  changePassword,
  changePhone,
  deleteAccount,
  parseFullName,
  registerAccount,
} = await import("../src/lib/services/accountServices.js");
const { hashPassword } = await import("../src/lib/password.js");

const PASSWORD = "correct horse battery staple";
const passwordHash = await hashPassword(PASSWORD);

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    firstName: "ada",
    lastName: "lovelace",
    email: "ada@example.test",
    phoneNumber: null,
    password: passwordHash,
    ...overrides,
  };
}

const VALID_ACCOUNT: NewAccount = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.test",
  password: "a".repeat(12),
};

function registration(overrides: Partial<NewAccount> = {}): NewAccount {
  return { ...VALID_ACCOUNT, ...overrides };
}

beforeEach(() => {
  state.byEmail = undefined;
  state.byName = undefined;
  state.created = undefined;
  state.writeError = undefined;
  for (const fn of [getUser, getUserByEmail, createUser, setEmail, setPhone, setPassword, deleteUsers]) {
    fn.mock.resetCalls();
  }
});

describe("parseFullName", () => {
  it("splits two letter-only words into lowercase first and last names", () => {
    assert.deepEqual(parseFullName("Ada Lovelace"), { firstName: "ada", lastName: "lovelace" });
  });

  it("rejects a single word", () => {
    assert.throws(
      () => parseFullName("Ada"),
      (err: unknown) =>
        err instanceof AccountError &&
        err.message === "Enter a first name and a last name, separated by a space.",
    );
  });

  it("rejects three words", () => {
    assert.throws(
      () => parseFullName("Ada King Lovelace"),
      (err: unknown) =>
        err instanceof AccountError &&
        err.message === "Enter a first name and a last name, separated by a space.",
    );
  });

  it("rejects digits in a name", () => {
    assert.throws(
      () => parseFullName("Ada L0velace"),
      (err: unknown) => err instanceof AccountError && err.message === "Names may only contain letters (a-z).",
    );
  });

  it("rejects empty input", () => {
    assert.throws(
      () => parseFullName("   "),
      (err: unknown) =>
        err instanceof AccountError &&
        err.message === "Enter a first name and a last name, separated by a space.",
    );
  });
});

describe("registerAccount", () => {
  it("rejects a name with characters other than a-z before any database lookup", async () => {
    await assert.rejects(
      registerAccount(registration({ firstName: "ada1" })),
      (err: unknown) => err instanceof AccountError && err.message === "Names may only contain letters (a-z).",
    );
    assert.equal(createUser.mock.callCount(), 0);
  });

  it("rejects an invalid email address before any database lookup", async () => {
    await assert.rejects(
      registerAccount(registration({ email: "not-an-email" })),
      (err: unknown) => err instanceof AccountError && err.message === "Enter a valid email address.",
    );
    assert.equal(createUser.mock.callCount(), 0);
  });

  it("rejects a password of 11 characters", async () => {
    await assert.rejects(
      registerAccount(registration({ password: "a".repeat(11) })),
      (err: unknown) =>
        err instanceof AccountError &&
        err.message === "Password does not meet the length requirements: 12-128 char length",
    );
    assert.equal(createUser.mock.callCount(), 0);
  });

  it("rejects a password of 129 characters", async () => {
    await assert.rejects(
      registerAccount(registration({ password: "a".repeat(129) })),
      (err: unknown) =>
        err instanceof AccountError &&
        err.message === "Password does not meet the length requirements: 12-128 char length",
    );
    assert.equal(createUser.mock.callCount(), 0);
  });

  it("accepts a password of 12 characters and returns the created user", async () => {
    const created = makeUser({ id: "22222222-2222-4222-8222-222222222222" });
    state.created = created;
    const result = await registerAccount(registration({ password: "a".repeat(12) }));
    assert.equal(result, created);
    assert.equal(createUser.mock.callCount(), 1);
  });

  it("rejects an email that is already in use", async () => {
    state.byEmail = makeUser();
    await assert.rejects(
      registerAccount(registration()),
      (err: unknown) => err instanceof AccountError && err.message === "Email is already in use.",
    );
    assert.equal(createUser.mock.callCount(), 0);
  });

  it("rejects a name that is already registered", async () => {
    state.byName = makeUser();
    await assert.rejects(
      registerAccount(registration()),
      (err: unknown) =>
        err instanceof AccountError && err.message === '"ada lovelace" is already registered.',
    );
    assert.equal(createUser.mock.callCount(), 0);
  });
});

describe("changeEmail", () => {
  it("requires a password before it checks the new email", async () => {
    await assert.rejects(
      changeEmail(makeUser({ password: null }), "not-an-email"),
      (err: unknown) => err instanceof AccountError && err.message === "Set a password first",
    );
  });

  it("rejects an invalid new email", async () => {
    await assert.rejects(
      changeEmail(makeUser(), "not-an-email"),
      (err: unknown) => err instanceof AccountError && err.message === "Not a valid email",
    );
  });

  it("rejects the email the account already has, ignoring case", async () => {
    await assert.rejects(
      changeEmail(makeUser(), "ADA@example.test"),
      (err: unknown) => err instanceof AccountError && err.message === "Email already matches",
    );
  });

  it("maps a unique violation (code 23505) to 'Email is already in use.'", async () => {
    state.writeError = Object.assign(new Error("duplicate key value"), { code: "23505" });
    await assert.rejects(
      changeEmail(makeUser(), "grace@example.test"),
      (err: unknown) => err instanceof AccountError && err.message === "Email is already in use.",
    );
  });

  it("maps a unique violation wrapped in error.cause (code 23505) to 'Email is already in use.'", async () => {
    state.writeError = new Error("query failed", { cause: { code: "23505" } });
    await assert.rejects(
      changeEmail(makeUser(), "grace@example.test"),
      (err: unknown) => err instanceof AccountError && err.message === "Email is already in use.",
    );
  });
});

describe("changePhone", () => {
  it("requires a password before it checks the new phone number", async () => {
    await assert.rejects(
      changePhone(makeUser({ password: null }), "123"),
      (err: unknown) => err instanceof AccountError && err.message === "Set a password first",
    );
  });

  it("rejects the phone number the account already has, ignoring surrounding spaces", async () => {
    await assert.rejects(
      changePhone(makeUser({ phoneNumber: "7036878555" }), " 7036878555 "),
      (err: unknown) => err instanceof AccountError && err.message === "Phone number matches",
    );
  });

  it("rejects a phone number that is not ten digits", async () => {
    await assert.rejects(
      changePhone(makeUser(), "123"),
      (err: unknown) => err instanceof AccountError && err.message === "Not a valid phone number",
    );
  });

  it("maps a unique violation (code 23505) to 'Phone number is already in use.'", async () => {
    state.writeError = Object.assign(new Error("duplicate key value"), { code: "23505" });
    await assert.rejects(
      changePhone(makeUser(), "7036878555"),
      (err: unknown) => err instanceof AccountError && err.message === "Phone number is already in use.",
    );
  });

  it("maps a unique violation wrapped in error.cause (code 23505) to 'Phone number is already in use.'", async () => {
    state.writeError = new Error("query failed", { cause: { code: "23505" } });
    await assert.rejects(
      changePhone(makeUser(), "7036878555"),
      (err: unknown) => err instanceof AccountError && err.message === "Phone number is already in use.",
    );
  });
});

describe("changePassword", () => {
  it("requires the current password when one is set", async () => {
    await assert.rejects(
      changePassword(makeUser(), "b".repeat(12)),
      (err: unknown) => err instanceof AccountError && err.message === "Current password is incorrect",
    );
    assert.equal(setPassword.mock.callCount(), 0);
  });

  it("rejects a wrong current password", async () => {
    await assert.rejects(
      changePassword(makeUser(), "b".repeat(12), "wrong horse battery staple"),
      (err: unknown) => err instanceof AccountError && err.message === "Current password is incorrect",
    );
    assert.equal(setPassword.mock.callCount(), 0);
  });
});

describe("deleteAccount", () => {
  it("requires a password on the account before deleting it", async () => {
    await assert.rejects(
      deleteAccount(makeUser({ password: null }), PASSWORD),
      (err: unknown) =>
        err instanceof AccountError && err.message === "Set a password before deleting this account.",
    );
    assert.equal(deleteUsers.mock.callCount(), 0);
  });

  it("rejects a wrong current password", async () => {
    await assert.rejects(
      deleteAccount(makeUser(), "wrong horse battery staple"),
      (err: unknown) => err instanceof AccountError && err.message === "Current password is incorrect",
    );
    assert.equal(deleteUsers.mock.callCount(), 0);
  });

  it("deletes the account when the current password matches", async () => {
    const user = makeUser();
    await deleteAccount(user, PASSWORD);
    assert.equal(deleteUsers.mock.callCount(), 1);
    assert.deepEqual(deleteUsers.mock.calls[0].arguments[0], user);
  });
});

describe("authenticate", () => {
  it("returns undefined for an email that is not registered", async () => {
    assert.equal(await authenticate("nobody@example.test", PASSWORD), undefined);
  });

  it("returns undefined for an account that has no password", async () => {
    state.byEmail = makeUser({ password: null });
    assert.equal(await authenticate("ada@example.test", PASSWORD), undefined);
  });

  it("returns the user when the password matches", async () => {
    const user = makeUser();
    state.byEmail = user;
    assert.equal(await authenticate("ada@example.test", PASSWORD), user);
  });

  it("looks up the email in lowercase", async () => {
    state.byEmail = makeUser();
    await authenticate("ADA@Example.test", PASSWORD);
    assert.equal(getUserByEmail.mock.calls[0].arguments[0], "ada@example.test");
  });
});
