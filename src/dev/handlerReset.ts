import { deleteUsers } from "../lib/db/queries/usersdelete.js";

export async function handlerReset(cmdName: string): Promise<void> {
    const deleteCheck = await deleteUsers();
    if (deleteCheck == undefined) {
        console.log("Nothing to delete");
        return;
    }
    console.log("Users deleted");
}
