import { getUser, getUserByEmail } from "../db/queries/userget.js";
import { createUser } from "../db/queries/users.js";
import { setEmail } from "../db/queries/setEmail.js";
import { setPhone } from "../db/queries/setPhone.js";
import { setPassword } from "../db/queries/setPassword.js";
import { deleteUsers } from "../db/queries/userdelete.js";
import type { User } from "../db/schema.js";
import { hashPassword, MAX_PASSWORD_LENGTH, verifyPassword } from "../password.js";

export const MIN_PASSWORD_LENGTH = 12;

// Names are single words of ASCII letters. They are stored in lowercase.
export const NAME_REGEX = /^[a-z]+$/;

// Practical email check: local part (no leading, trailing, or doubled dots),
// "@", one or more dot-separated domain labels, and a top-level domain of 2+ letters.
export const EMAIL_REGEX = /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

// Ten digits with no country code (e.g. 7036878555). Area code and exchange must start with 2-9.
export const PHONE_REGEX = /^[2-9]\d{2}[2-9]\d{6}$/;

// A rule violation. The message is written to be shown to the user as-is.
export class AccountError extends Error {}

export type FullName = { firstName: string; lastName: string };

export type NewAccount = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

// Parses "First Last" into lowercase parts. Throws AccountError unless the input is
// exactly two letter-only words.
export function parseFullName(input: string): FullName {
  const parts = input.trim().toLowerCase().split(/\s+/);
  if (parts.length !== 2) {
    throw new AccountError("Enter a first name and a last name, separated by a space.");
  }
  const [firstName, lastName] = parts;
  if (!NAME_REGEX.test(firstName) || !NAME_REGEX.test(lastName)) {
    throw new AccountError("Names may only contain letters (a-z).");
  }
  return { firstName, lastName };
}

function assertPasswordLength(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new AccountError(
      `Password does not meet the length requirements: ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} char length`,
    );
  }
}

// Email is required at registration. Names are stored in lowercase, and so is the email.
export async function registerAccount(input: NewAccount): Promise<User> {
  const firstName = input.firstName.trim().toLowerCase();
  const lastName = input.lastName.trim().toLowerCase();
  if (!firstName || !lastName) {
    throw new AccountError("Enter your first and last name.");
  }
  if (!NAME_REGEX.test(firstName) || !NAME_REGEX.test(lastName)) {
    throw new AccountError("Names may only contain letters (a-z).");
  }
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    throw new AccountError("Enter a valid email address.");
  }
  assertPasswordLength(input.password);
  if (await getUserByEmail(email)) {
    throw new AccountError("Email is already in use.");
  }
  if (await getUser(firstName, lastName)) {
    throw new AccountError(`"${firstName} ${lastName}" is already registered.`);
  }
  const created = await createUser(firstName, lastName, email, await hashPassword(input.password));
  if (!created) {
    throw new AccountError(`"${firstName} ${lastName}" is already registered.`);
  }
  return created;
}

// Dummy hash for unknown emails, so the response time does not reveal which emails exist.
let dummyHashPromise: Promise<string> | undefined;
function dummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("dummy-password-for-timing");
  return dummyHashPromise;
}

// Returns the user when the email and password match. Accounts without a password cannot
// sign in on the web.
export async function authenticate(email: string, password: string): Promise<User | undefined> {
  const user = await getUserByEmail(email.trim().toLowerCase());
  if (!user || !user.password) {
    await verifyPassword(password, await dummyHash());
    return undefined;
  }
  return (await verifyPassword(password, user.password)) ? user : undefined;
}

export async function changePassword(
  user: User,
  newPassword: string,
  currentPassword?: string,
): Promise<void> {
  assertPasswordLength(newPassword);
  if (user.password) {
    if (currentPassword === undefined || !(await verifyPassword(currentPassword, user.password))) {
      throw new AccountError("Current password is incorrect");
    }
  }
  await setPassword(user, await hashPassword(newPassword));
}

export async function changeEmail(user: User, newEmail: string): Promise<User> {
  if (!user.password) {
    throw new AccountError("Set a password first");
  }
  const email = newEmail.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    throw new AccountError("Not a valid email");
  }
  if (email === user.email) {
    throw new AccountError("Email already matches");
  }
  try {
    return await setEmail(user, email);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AccountError("Email is already in use.");
    }
    throw error;
  }
}

export async function changePhone(user: User, newPhone: string): Promise<User> {
  if (!user.password) {
    throw new AccountError("Set a password first");
  }
  const phone = newPhone.trim();
  if (user.phoneNumber === phone) {
    throw new AccountError("Phone number matches");
  }
  if (!PHONE_REGEX.test(phone)) {
    throw new AccountError("Not a valid phone number");
  }
  try {
    return await setPhone(user, phone);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AccountError("Phone number is already in use.");
    }
    throw error;
  }
}

export async function deleteAccount(user: User, currentPassword: string): Promise<void> {
  if (!user.password) {
    throw new AccountError("Set a password before deleting this account.");
  }
  if (!(await verifyPassword(currentPassword, user.password))) {
    throw new AccountError("Current password is incorrect");
  }
  await deleteUsers(user);
}

// Postgres unique_violation (23505). The driver may wrap it, so check the cause too.
function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const direct = (error as { code?: unknown }).code;
  const cause = (error as { cause?: unknown }).cause;
  const nested =
    typeof cause === "object" && cause !== null ? (cause as { code?: unknown }).code : undefined;
  return direct === "23505" || nested === "23505";
}
