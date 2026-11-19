import {homedir} from 'node:os';
import fs from 'node:fs/promises';
await fs.mkdir(new URL('./screenshots/',import.meta.url),{recursive:true});
import {pathToFileURL} from 'node:url';
let playwright;
try { playwright=await import('playwright'); }
catch {
 const location=process.env.COSMOS_PLAYWRIGHT_MODULE||`${homedir()}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs`;
 try {playwright=await import(pathToFileURL(location).href);}
 catch {throw Error('Browser checks require Playwright. Install it in this project or set COSMOS_PLAYWRIGHT_MODULE to its index.mjs. The game itself needs no packages.');}
}
export const {chromium,firefox,webkit}=playwright;

export const BASE_URL=process.env.COSMOS_TEST_URL||'http://127.0.0.1:4173';
