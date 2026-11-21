import { User } from "./commandHandler.js";
import { setPhone } from "./lib/db/queries/setPhone.js";

// Ten digits with no country code (e.g. 7036878555). Area code and exchange must start with 2-9.
export const PHONE_REGEX = /^[2-9]\d{2}[2-9]\d{6}$/;

export async function handlerPhone(cmdName: string, user: User, phone: string) {
    if (!user.password) {
        console.error("Set a password first");
    }
    if (!PHONE_REGEX.test(phone)) {
        console.error("Not a valid phone number");
        return;
    }
    const result = await setPhone(user, phone);
    console.log(`Phone number changed to: ${result.phoneNumber}`);
    return;
}