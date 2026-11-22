import { User } from "../lib/db/schema.js";
import { setPassword } from "../lib/db/queries/setPassword.js";
import { hashPassword, MAX_PASSWORD_LENGTH, verifyPassword } from "../lib/password.js";
import { promptSecret } from "../lib/prompt.js";

export async function handlerPassword(cmdName: string, user: User){
  const password = await promptSecret("Enter new password: ");
  if (password.length < 12 || password.length > MAX_PASSWORD_LENGTH) {
      console.error("Password does not meet the length requirements: 12-128 char length");
      process.exitCode = 1;
      return;
  }
  if (user.password) {
        const current = await promptSecret("Input current password: ");
        if (!await verifyPassword(current, user.password)) {
            console.error("Current password is incorrect");
            process.exitCode = 1;
            return;
        }
  }
  const hashed = await hashPassword(password);
  await setPassword(user, hashed);
  console.log("Password set successfully");
}
