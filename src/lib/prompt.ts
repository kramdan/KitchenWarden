import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";

export async function promptSecret(question: string): Promise<string> {
    let muted = false;
    const output = new Writable({
        write(chunk, encoding, callback) {
            if (!muted) {
                process.stdout.write(chunk, encoding);
            }
            callback();
        },
    });
    const rl = createInterface({ input: process.stdin, output, terminal: true });
    try {
        process.stdout.write(question);
        muted = true;
        return await rl.question("");
    } finally {
        muted = false;
        process.stdout.write("\n");
        rl.close();
    }
}
