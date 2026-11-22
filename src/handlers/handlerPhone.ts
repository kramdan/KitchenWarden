import { User } from "../lib/db/schema.js";
import { setPhone } from "../lib/db/queries/setPhone.js";
import { promptText } from "../lib/promptText.js";

// Ten digits with no country code (e.g. 7036878555). Area code and exchange must start with 2-9.
export const PHONE_REGEX = /^[2-9]\d{2}[2-9]\d{6}$/;

export async function handlerPhone(cmdName: string, user: User) {
    if (!user.password) {
        console.error("Set a password first");
        process.exitCode = 1;
        return;
    }
    const phone = (await promptText("Enter phone number: ")).trim();
    if (user.phoneNumber == phone) {
        console.error("Phone number matches");
        process.exitCode = 1;
        return;
    }
    if (!PHONE_REGEX.test(phone)) {
        console.error("Not a valid phone number");
        process.exitCode = 1;
        return;
    }
    const result = await setPhone(user, phone);
    console.log(`Phone number changed to: ${result.phoneNumber}`);
    return;
}