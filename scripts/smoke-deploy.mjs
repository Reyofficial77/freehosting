// End-to-end smoke test against a running FreeHosting server.
// Usage: node scripts/smoke-deploy.mjs <path-to-zip> [baseUrl]
// It uploads a ZIP, then polls the deployment endpoint until it reaches a
// terminal state. It prints the project id so it can be cleaned up afterwards.
import { readFile } from "node:fs/promises";

const zipPath = process.argv[2];
const baseUrl = process.argv[3] || "http://localhost:3000";
if (!zipPath) {
  console.error("Usage: node scripts/smoke-deploy.mjs <path-to-zip> [baseUrl]");
  process.exit(1);
}

const bytes = await readFile(zipPath);
const form = new FormData();
form.set("file", new Blob([bytes], { type: "application/zip" }), "smoke-test.zip");
form.set("name", "smoke-test-" + Date.now().toString(36));

const upload = await fetch(`${baseUrl}/api/upload`, { method: "POST", body: form });
const cookie = upload.headers.get("set-cookie");
const body = await upload.json();
console.log("upload status:", upload.status);
console.log(JSON.stringify(body, null, 2));

const deploymentId = body?.deployment?.id;
const projectId = body?.project?.id;
if (!deploymentId) {
  console.log("No deployment created (deploy may be disabled). Project id:", projectId);
  process.exit(0);
}

let final = null;
for (let attempt = 0; attempt < 40; attempt++) {
  await new Promise(resolve => setTimeout(resolve, 4000));
  const response = await fetch(`${baseUrl}/api/deployments/${deploymentId}`, {
    headers: cookie ? { Cookie: cookie.split(";")[0] } : {}
  });
  if (!response.ok) continue;
  const json = await response.json();
  const status = json?.deployment?.status;
  console.log(`poll ${attempt + 1}:`, status, json?.deployment?.deploymentUrl ?? "");
  final = json;
  if (["ready", "failed", "cancelled"].includes(status)) break;
}

console.log("final:", JSON.stringify(final, null, 2));
console.log("projectId:", projectId);
console.log("deploymentId:", deploymentId);
