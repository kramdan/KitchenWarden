import { deleteUsers } from "./usersdelete.js";

// Returns true when at least one user was deleted.
export async function handlerReset(cmdName: string): Promise<boolean> {
    const deleteCheck = await deleteUsers();
    if (deleteCheck == undefined) {
        console.log("Nothing to delete");
        return false;
    }
    console.log("Users deleted");
    return true;
}
