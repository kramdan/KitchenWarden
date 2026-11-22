import { User } from "../lib/db/schema.js";
import { setEmail } from "../lib/db/queries/setEmail.js";
import { promptText } from "../lib/promptText.js";

// Practical email check: local part (no leading, trailing, or doubled dots),
// "@", one or more dot-separated domain labels, and a top-level domain of 2+ letters.
export const EMAIL_REGEX = /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export async function handlerEmail(cmdName: string, user: User) {
    if (!user.password) {
        console.error("Set a password first");
        process.exitCode = 1;
        return;
    }
    const newEmail = (await promptText("Enter new email: ")).trim();
    if (!EMAIL_REGEX.test(newEmail)) {
        console.error("Not a valid email");
        process.exitCode = 1;
        return;
    }
    if (newEmail == user.email) {
        console.error("Email already matches");
        process.exitCode = 1;
        return;
    }
    const result = await setEmail(user, newEmail);
    console.log(`Email changed to: ${result.email}`);
    return;
}