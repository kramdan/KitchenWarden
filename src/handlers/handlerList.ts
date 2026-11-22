import { listUsers } from "../lib/db/queries/userslist.js";


export async function handlerList() {
    const usersList = await listUsers();
    for (let u of usersList) {
        const pNumber = u.phoneNumber ? u.phoneNumber.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3") : "N/A";
        console.log(`Name: ${u.name}, Id: ${u.id}, Email: ${u.email ? u.email : "N/A"}, Phone#: ${pNumber}`);
    }
}