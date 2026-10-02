#!/usr/bin/env node
// Chiffre les fichiers servis publiquement avec le mot de passe partagé
// (PBKDF2-SHA256 -> AES-GCM). Le navigateur les déchiffre après saisie du mot de passe.
//
//   # jeton GitHub -> gh_config.js
//   GH_TOKEN=github_pat_... PASSWORD='...' node encrypt.mjs token owner/repo [branch] [dir]
//
//   # liens à évaluer + annuaire des documents -> links.enc.js
//   python build_payload.py           # produit ../output/l2/tagging_payload.json
//   PASSWORD='...' node encrypt.mjs data ../output/l2/tagging_payload.json
import { webcrypto as crypto } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const ITERATIONS = 600000;
const b64 = (buf) => Buffer.from(buf).toString("base64");

async function encrypt(plain, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    material, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return { salt: b64(salt), iv: b64(iv), iterations: ITERATIONS, ct: b64(ct) };
}

function write(name, varName, value) {
  writeFileSync(new URL("./" + name, import.meta.url), `window.${varName} = ${JSON.stringify(value)};\n`);
}

const [mode, ...args] = process.argv.slice(2);
const { GH_TOKEN, PASSWORD } = process.env;
if (!PASSWORD) { console.error("PASSWORD manquant"); process.exit(1); }

if (mode === "token") {
  const [repo, branch = "main", dir = "votes"] = args;
  if (!repo || !GH_TOKEN) { console.error("Usage: GH_TOKEN=... PASSWORD=... node encrypt.mjs token owner/repo [branch] [dir]"); process.exit(1); }
  const enc = await encrypt(new TextEncoder().encode(GH_TOKEN), PASSWORD);
  write("gh_config.js", "GH_CONFIG", { repo, branch, dir, enc });
  console.log(`gh_config.js écrit pour ${repo}@${branch} (${dir}/)`);
} else if (mode === "data") {
  const [file] = args;
  if (!file) { console.error("Usage: PASSWORD=... node encrypt.mjs data <links.json>"); process.exit(1); }
  const json = readFileSync(file, "utf-8");
  JSON.parse(json); // échoue tôt si le fichier n'est pas du JSON valide
  const enc = await encrypt(gzipSync(Buffer.from(json, "utf-8")), PASSWORD);
  write("links.enc.js", "LINKS_ENC", enc);
  console.log(`links.enc.js écrit (${(enc.ct.length / 1024).toFixed(0)} Ko en base64)`);
} else {
  console.error("Mode attendu : token | data");
  process.exit(1);
}
