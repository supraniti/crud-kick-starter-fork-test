import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CURRENT_FILE = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(CURRENT_FILE), "..");
const ARTIFACT_ROOT = path.join(ROOT_DIR, "e2e", "smoke", "artifacts");
const SUMMARY_PATH = path.join(ARTIFACT_ROOT, "last-run-summary.json");
const APP_PORTS = [3000, 3001];

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    ...options
  });
  if (result.error) {
    throw result.error;
  }
  return result;
}

function sleepMs(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function parseJsonStdout(result) {
  const rawOutput = String(result.stdout || "").trim();
  if (!rawOutput) {
    return [];
  }

  const parsed = JSON.parse(rawOutput);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function readWindowsProcessName(processId) {
  const result = runCommand("tasklist", ["/FI", `PID eq ${processId}`, "/FO", "CSV", "/NH"]);
  if (result.status !== 0) {
    return "";
  }

  const rawLine = String(result.stdout || "")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("INFO:"));
  if (!rawLine) {
    return "";
  }

  const match = rawLine.match(/^"([^"]+)"/);
  return match?.[1] ?? "";
}

function listWindowsListenersByPort(ports) {
  const result = runCommand("netstat", ["-ano", "-p", "TCP"]);
  if (result.status !== 0) {
    return [];
  }

  const portSet = new Set(ports.map((value) => Number(value)));
  const byProcessId = new Map();
  for (const rawLine of String(result.stdout || "").split(/\r?\n/)) {
    const lineMatch = rawLine.match(/^\s*TCP\s+(\S+):(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i);
    if (!lineMatch) {
      continue;
    }

    const [, localAddress, localPortText, processIdText] = lineMatch;
    const localPort = Number(localPortText);
    if (!portSet.has(localPort)) {
      continue;
    }

    const processId = Number(processIdText);
    if (!Number.isInteger(processId) || processId <= 0) {
      continue;
    }
    if (byProcessId.has(processId)) {
      continue;
    }

    byProcessId.set(processId, {
      processId,
      parentProcessId: 0,
      processName: readWindowsProcessName(processId),
      localAddress,
      localPort,
      commandLine: "",
      parentCommandLine: ""
    });
  }

  return [...byProcessId.values()];
}

function listListeningProcesses(ports) {
  if (process.platform !== "win32") {
    return [];
  }
  return listWindowsListenersByPort(ports);
}

function isKnownRepoAppProcess(listener) {
  const commandText = `${listener.commandLine || ""} ${listener.parentCommandLine || ""}`.toLowerCase();
  const processName = String(listener.processName || "").toLowerCase();
  return (
    commandText.includes("src/index.js") ||
    commandText.includes("--watch") ||
    commandText.includes("vite") ||
    commandText.includes("playwright") ||
    commandText.includes("crud-kick-starter") ||
    processName === "node.exe" ||
    processName === "node"
  );
}

function killWindowsProcessTree(processId) {
  if (!processId || Number(processId) <= 0) {
    return;
  }

  runCommand("taskkill", ["/PID", String(processId), "/T", "/F"], {
    stdio: "ignore",
    shell: true
  });
}

function assertOnlyKnownRepoListeners(listeners) {
  const unexpectedListeners = listeners.filter((listener) => !isKnownRepoAppProcess(listener));
  if (unexpectedListeners.length > 0) {
    throw new Error(
      `[e2e:smoke] refusing to clear unexpected listeners on app ports: ${JSON.stringify(unexpectedListeners)}`
    );
  }
}

function collectProcessIdsToKill(listeners) {
  const processIdsToKill = new Set();
  for (const listener of listeners) {
    processIdsToKill.add(listener.processId);
    if (
      listener.parentProcessId > 0 &&
      typeof listener.parentCommandLine === "string" &&
      listener.parentCommandLine.toLowerCase().includes("--watch")
    ) {
      processIdsToKill.add(listener.parentProcessId);
    }
  }
  return processIdsToKill;
}

function clearRepoAppListeners(ports) {
  let sawListeners = false;
  let consecutiveClearChecks = 0;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const listeners = listListeningProcesses(ports);
    if (listeners.length === 0) {
      consecutiveClearChecks += 1;
      if (consecutiveClearChecks >= 5) {
        return;
      }
      sleepMs(300);
      continue;
    }

    assertOnlyKnownRepoListeners(listeners);
    const processIdsToKill = collectProcessIdsToKill(listeners);
    if (processIdsToKill.size === 0) {
      sleepMs(300);
      continue;
    }

    if (!sawListeners) {
      console.log(`[e2e:smoke] clearing stale app listeners on ports ${ports.join(", ")}...`);
      sawListeners = true;
    }
    consecutiveClearChecks = 0;
    for (const processId of processIdsToKill) {
      killWindowsProcessTree(processId);
    }
    sleepMs(300);
  }

  throw new Error(`[e2e:smoke] app ports remain occupied after cleanup attempt: ${ports.join(", ")}`);
}

function ensureCleanArtifactsDir() {
  fs.rmSync(ARTIFACT_ROOT, {
    recursive: true,
    force: true
  });
  fs.mkdirSync(ARTIFACT_ROOT, {
    recursive: true
  });
}

function runPlaywrightSmoke() {
  clearRepoAppListeners(APP_PORTS);
  return spawnSync(
    "pnpm",
    ["exec", "playwright", "test", "--config", "e2e/smoke/playwright.config.mjs"],
    {
      cwd: ROOT_DIR,
      stdio: "inherit",
      shell: true
    }
  );
}

function writeSummary(result) {
  const payload = {
    ok: result.status === 0,
    lane: "browser-smoke-e2e",
    command: "pnpm exec playwright test --config e2e/smoke/playwright.config.mjs",
    reportPath: path.join("e2e", "smoke", "artifacts", "playwright-report.json"),
    outputDir: path.join("e2e", "smoke", "artifacts", "test-output"),
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(SUMMARY_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

function main() {
  ensureCleanArtifactsDir();
  const result = runPlaywrightSmoke();
  const summary = writeSummary(result);
  console.log(JSON.stringify(summary, null, 2));

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  }
}

main();
