import { listUsers } from "./lib/db/queries/userslist.js";


export async function handlerList() {
    const usersList = await listUsers();
    for (let u of usersList) {
        console.log(`Name: ${u.name}, Id: ${u.id}, Email: ${u.email ? u.email : "N/A"}, Phone#: ${u.phoneNumber ? u.phoneNumber : "N/A"}`);
    }
}