import "dotenv/config";

export function readConfig() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        throw new Error(
            "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
        );
    }
    return dbUrl;
}