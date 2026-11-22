import { getUser } from "../db/queries/userget.js";
import { createUser } from "../db/queries/users.js";
import { setEmail } from "../db/queries/setEmail.js";
import { setPhone } from "../db/queries/setPhone.js";
import { setPassword } from "../db/queries/setPassword.js";
import { deleteUsers } from "../db/queries/userdelete.js";
import type { User } from "../db/schema.js";
import { hashPassword, MAX_PASSWORD_LENGTH, verifyPassword } from "../password.js";

export const MIN_PASSWORD_LENGTH = 12;

// Practical email check: local part (no leading, trailing, or doubled dots),
// "@", one or more dot-separated domain labels, and a top-level domain of 2+ letters.
export const EMAIL_REGEX = /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

// Ten digits with no country code (e.g. 7036878555). Area code and exchange must start with 2-9.
export const PHONE_REGEX = /^[2-9]\d{2}[2-9]\d{6}$/;

// A rule violation. The message is written to be shown to the user as-is.
export class AccountError extends Error {}

export async function registerAccount(username: string): Promise<User> {
  const name = username.trim();
  if (!name) {
    throw new AccountError("No username provided.");
  }
  if (await getUser(name)) {
    throw new AccountError(`Username "${name}" is already registered.`);
  }
  const created = await createUser(name);
  if (!created) {
    throw new AccountError(`Username "${name}" is already registered.`);
  }
  return created;
}

export async function changePassword(
  user: User,
  newPassword: string,
  currentPassword?: string,
): Promise<void> {
  if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > MAX_PASSWORD_LENGTH) {
    throw new AccountError(
      `Password does not meet the length requirements: ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} char length`,
    );
  }
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
  const email = newEmail.trim();
  if (!EMAIL_REGEX.test(email)) {
    throw new AccountError("Not a valid email");
  }
  if (email === user.email) {
    throw new AccountError("Email already matches");
  }
  return setEmail(user, email);
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
  return setPhone(user, phone);
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
