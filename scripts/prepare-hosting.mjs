import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dist = resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const server = resolve(dist, "server");
const files = {};

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = resolve(directory, entry.name);
    if (fullPath.startsWith(server)) continue;
    if (entry.isDirectory()) await collect(fullPath);
    else files[`/${relative(dist, fullPath).replaceAll("\\", "/")}`] = (await readFile(fullPath)).toString("base64");
  }
}

await collect(dist);
await mkdir(server, { recursive: true });

const worker = `const files = ${JSON.stringify(files)};
const contentTypes = ${JSON.stringify({ ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8" })};
function decode(value) { const binary = atob(value); const bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index); return bytes; }
export default { async fetch(request) { const url = new URL(request.url); const path = url.pathname === "/" ? "/index.html" : url.pathname; const value = files[path] ?? (request.method === "GET" && !url.pathname.includes(".") ? files["/index.html"] : undefined); if (!value) return new Response("Not found", { status: 404 }); const extension = path.slice(path.lastIndexOf(".")); return new Response(decode(value), { headers: { "content-type": contentTypes[extension] ?? "application/octet-stream", "cache-control": path === "/index.html" ? "no-cache" : "public, max-age=31536000, immutable" } }); } };
`;

await writeFile(resolve(server, "index.js"), worker, "utf8");
