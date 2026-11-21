import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type Config = {
    dbUrl: string;
    currentUserName: string;
}

export function setUser(name: string): void {
    const newUser: Config = {
        dbUrl: JSON.parse(fs.readFileSync(getConfigFilePath(), 'utf-8')).db_url,
        currentUserName: name
    }
    writeConfig(newUser);
    console.log("User has been set");
}

export function readConfig() {
    const readFile = fs.readFileSync(getConfigFilePath(), 'utf-8');
    const config = JSON.parse(readFile);
    validateConfig(config);
    return { dbUrl: config.db_url, currentUserName: config.current_user_name};
}

function getConfigFilePath(): string {
    const srcDir = path.dirname(fileURLToPath(import.meta.url));
    const configFilePath = path.join(srcDir, 'kw.config.json');
    return configFilePath;
}

function validateConfig(rawConfig: any): Config {
    if (typeof rawConfig !== 'object' || rawConfig === null) {
        throw new Error('Invalid configuration: not an object');
    }
    if (typeof rawConfig.db_url !== 'string') {
        throw new Error('Invalid configuration: dbUrl must be a string');
    }
    if (typeof rawConfig.current_user_name !== 'string') {
        throw new Error('Invalid configuration: currentUserName must be a string');
    }
    return rawConfig as Config;
}

function writeConfig(cfg: Config): void {
    const writeConfig = {
        db_url: cfg.dbUrl,
        current_user_name: cfg.currentUserName
    }
    fs.writeFileSync(getConfigFilePath(), JSON.stringify(writeConfig));
}