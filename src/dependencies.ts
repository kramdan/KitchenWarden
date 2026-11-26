import { openDatabase, type Db } from "./lib/db/index.js";

export type Dependencies = {
  appOrigin: string;
  port: number;
  host: string;
  databasePath: string;
  maxRequestBodyBytes: number;
  maxUploadBytes: number;
  trustedProxyHops: number;
  downloadSigningKey: Buffer;
  devTools: boolean;
  db: Db;
};

export function requireENV(name: string): string {
  const value = process.env[name];
  if (value == "" || value == undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseNonNegativeInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

export function initDependencies(
  env: NodeJS.ProcessEnv = process.env,
): Dependencies {
  const port = parseNonNegativeInteger(env.PORT ?? "3000", "PORT");
  if (port > 65_535) {
    throw new Error("PORT must be no greater than 65535");
  }
  const host = requireENV("HOST");

  const downloadSigningKey = requireENV("DOWNLOAD_SIGNING_KEY");
  if (downloadSigningKey.length != 64) {
    throw new Error("DOWNLOAD_SIGNING_KEY length must equal 64");
  }
  const trustedProxyHops = parseNonNegativeInteger(env.TRUST_PROXY_HOPS ?? "0", "TRUST_PROXY_HOPS");

  const values = {
    appOrigin: new URL(env.APP_ORIGIN ?? "http://localhost:3000").origin,
    port,
    host,
    databasePath: requireENV("DATABASE_URL"),
    maxRequestBodyBytes: 32 * 1024,
    maxUploadBytes: 1024 * 1024,
    trustedProxyHops: trustedProxyHops,
    maxPublicProductResults: 50,
    downloadSigningKey: Buffer.from(downloadSigningKey, 'hex'),
    devTools: env.DEV_TOOLS === "true",
  };

  return { ...values, db: openDatabase() };
}
