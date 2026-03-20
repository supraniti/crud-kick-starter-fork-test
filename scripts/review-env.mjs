import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const ROOT_DIR = process.cwd();
const RUNTIME_DIR = path.join(ROOT_DIR, ".codex-runtime");
const PID_FILE = path.join(RUNTIME_DIR, "review-env-pids.json");
const FRONTEND_URL = "http://localhost:3000/";
const BACKEND_HEALTH_URL = "http://127.0.0.1:3001/health";
const PORTS = [3000, 3001];
const PNPM_CMD = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const HEALTH_REQUEST_TIMEOUT_MS = 3_000;

function timestampTag() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureRuntimeDir() {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

function openLogFile(filePath) {
  ensureRuntimeDir();
  return fs.openSync(filePath, "a");
}

function runProcessSync(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    shell: false,
    ...options
  });
}

function runChecked(command, args, options = {}) {
  const result = runProcessSync(command, args, options);
  if (result.status !== 0) {
    throw new Error(
      (result.stderr || result.stdout || `${command} ${args.join(" ")} failed`).trim()
    );
  }
  return result;
}

function parseListeningPids(netstatOutput, port) {
  return String(netstatOutput || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.includes(`:${port}`) && line.includes("LISTENING"))
    .map((line) => {
      const parts = line.split(/\s+/);
      return Number.parseInt(parts.at(-1), 10);
    })
    .filter((value) => Number.isInteger(value) && value > 0);
}

function listListeningPids(port) {
  const result = runProcessSync("cmd.exe", ["/c", `netstat -ano | findstr ":${port}"`]);
  if (result.status !== 0 && !String(result.stdout || "").trim()) {
    return [];
  }
  return parseListeningPids(result.stdout, port);
}

function stopPid(pid) {
  runProcessSync("taskkill", ["/PID", String(pid), "/T", "/F"]);
}

function clearPorts() {
  const stopped = [];
  for (const port of PORTS) {
    const pids = listListeningPids(port);
    for (const pid of pids) {
      if (!stopped.includes(pid)) {
        stopPid(pid);
        stopped.push(pid);
      }
    }
  }
  return stopped;
}

async function waitFor(check, timeoutMs, intervalMs = 750) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = HEALTH_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readJson(url) {
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

async function isBackendHealthy() {
  try {
    const payload = await readJson(BACKEND_HEALTH_URL);
    return payload?.ok === true && payload?.status === "healthy";
  } catch {
    return false;
  }
}

async function isFrontendHealthy() {
  try {
    const response = await fetchWithTimeout(FRONTEND_URL);
    const text = await response.text();
    return response.ok && /<!doctype html>/i.test(text);
  } catch {
    return false;
  }
}

function startDetachedProcess(command, argumentList, { stdoutPath, stderrPath }) {
  const child = spawn(command, argumentList, {
    cwd: ROOT_DIR,
    detached: true,
    stdio: ["ignore", openLogFile(stdoutPath), openLogFile(stderrPath)],
    windowsHide: true
  });
  child.unref();
  return child.pid;
}

function startDetachedNode(argumentList, options) {
  return startDetachedProcess(process.execPath, argumentList, options);
}

function stopPidSafe(pid) {
  try {
    stopPid(pid);
  } catch {
    return false;
  }
  return true;
}

async function buildFrontendDist() {
  try {
    runChecked(PNPM_CMD, ["--filter", "frontend", "build"]);
    return {
      mode: "fresh-build"
    };
  } catch (error) {
    const distIndexPath = path.join(ROOT_DIR, "frontend", "dist", "index.html");
    const hasExistingDist = fs.existsSync(distIndexPath);
    if (!hasExistingDist) {
      throw error;
    }
    return {
      mode: "existing-dist",
      warning: error.message
    };
  }
}

async function startFrontendDevServer(stamp) {
  const frontendCommand =
    process.platform === "win32"
      ? {
          command: "cmd.exe",
          args: [
            "/c",
            PNPM_CMD,
            "--filter",
            "frontend",
            "dev",
            "--host",
            "127.0.0.1",
            "--port",
            "3000",
            "--strictPort"
          ]
        }
      : {
          command: PNPM_CMD,
          args: ["--filter", "frontend", "dev", "--host", "127.0.0.1", "--port", "3000", "--strictPort"]
        };

  const frontendPid = startDetachedProcess(frontendCommand.command, frontendCommand.args, {
    stdoutPath: path.join(RUNTIME_DIR, `review-frontend-dev-${stamp}.log`),
    stderrPath: path.join(RUNTIME_DIR, `review-frontend-dev-${stamp}.err.log`)
  });

  const frontendReady = await waitFor(isFrontendHealthy, 20_000);
  if (!frontendReady) {
    stopPidSafe(frontendPid);
    return null;
  }

  return {
    pid: frontendPid,
    frontendBuild: {
      mode: "vite-dev"
    }
  };
}

async function startFrontendStaticServer(stamp) {
  const frontendBuild = await buildFrontendDist();
  const frontendPid = startDetachedNode(
    [path.join(ROOT_DIR, "scripts", "review-frontend-static-server.mjs")],
    {
      stdoutPath: path.join(RUNTIME_DIR, `review-frontend-${stamp}.log`),
      stderrPath: path.join(RUNTIME_DIR, `review-frontend-${stamp}.err.log`)
    }
  );

  const frontendReady = await waitFor(isFrontendHealthy, 20_000);
  if (!frontendReady) {
    throw new Error("Frontend did not become healthy on localhost:3000");
  }

  return {
    pid: frontendPid,
    frontendBuild
  };
}

async function startReviewEnv() {
  ensureRuntimeDir();
  const stoppedPids = clearPorts();

  const stamp = timestampTag();
  const backendPid = startDetachedNode([path.join(ROOT_DIR, "server", "src", "index.js")], {
    stdoutPath: path.join(RUNTIME_DIR, `review-backend-${stamp}.log`),
    stderrPath: path.join(RUNTIME_DIR, `review-backend-${stamp}.err.log`)
  });

  const backendReady = await waitFor(isBackendHealthy, 20_000);
  if (!backendReady) {
    throw new Error("Backend did not become healthy on 127.0.0.1:3001");
  }

  const frontendStart =
    (await startFrontendDevServer(stamp)) ?? (await startFrontendStaticServer(stamp));

  const payload = {
    startedAt: new Date().toISOString(),
    frontendUrl: FRONTEND_URL,
    backendHealthUrl: BACKEND_HEALTH_URL,
    clearedPids: stoppedPids,
    frontendBuild: frontendStart.frontendBuild,
    processes: {
      backendPid,
      frontendPid: frontendStart.pid
    }
  };
  await fsp.writeFile(PID_FILE, JSON.stringify(payload, null, 2), "utf8");
  process.stdout.write(`${JSON.stringify({ ok: true, ...payload }, null, 2)}\n`);
}

async function stopReviewEnv() {
  const stoppedPids = clearPorts();
  await fsp.rm(PID_FILE, { force: true });
  process.stdout.write(`${JSON.stringify({ ok: true, stoppedPids }, null, 2)}\n`);
}

async function statusReviewEnv() {
  let pidFile = null;
  try {
    pidFile = JSON.parse(await fsp.readFile(PID_FILE, "utf8"));
  } catch {
    pidFile = null;
  }
  const payload = {
    ok: true,
    frontendHealthy: await isFrontendHealthy(),
    backendHealthy: await isBackendHealthy(),
    pidFile
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

async function main() {
  const command = process.argv[2] ?? "start";
  if (command === "start" || command === "restart") {
    await startReviewEnv();
    return;
  }
  if (command === "stop") {
    await stopReviewEnv();
    return;
  }
  if (command === "status") {
    await statusReviewEnv();
    return;
  }
  throw new Error(`Unsupported review-env command '${command}'`);
}

main().catch((error) => {
  console.error(error?.message ?? String(error));
  process.exit(1);
});
