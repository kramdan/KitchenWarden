import { User } from "./commandHandler.js";
import { setEmail } from "./lib/db/queries/setEmail.js";

// Practical email check: local part (no leading, trailing, or doubled dots),
// "@", one or more dot-separated domain labels, and a top-level domain of 2+ letters.
export const EMAIL_REGEX = /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export async function handlerEmail(cmdName: string, user: User, email: string) {
    const newEmail = email.trim();
    if (!user.password) {
        console.error("Set a password first");
        return;
    }
    if (!EMAIL_REGEX.test(newEmail)) {
        console.error("Not a valid email");
        return;
    }
    const result = await setEmail(user, newEmail);
    console.log(`Email changed to: ${result.email}`);
    return;
}