const GROUP_STOP_GRACE_MS = 4_000;
const GROUP_STOP_KILL_WAIT_MS = 2_000;
const GROUP_POLL_MS = 25;

export function createInterruptController() {
  let interruptedBy = null;
  return {
    get interrupted() {
      return interruptedBy !== null;
    },
    get exitCode() {
      return interruptedBy === "SIGINT" ? 130 : interruptedBy === "SIGTERM" ? 143 : null;
    },
    request(signal) {
      if (signal === "SIGINT" || signal === "SIGTERM") interruptedBy ??= signal;
    },
    throwIfInterrupted() {
      if (interruptedBy !== null) throw new Error("diagnostic-interrupted");
    },
  };
}

export function registerInterruptCleanup({
  signalTarget = process,
  interruptController,
  cleanup,
  isSetup,
}) {
  if (
    typeof signalTarget?.on !== "function" ||
    typeof signalTarget?.off !== "function" ||
    typeof cleanup !== "function" ||
    typeof isSetup !== "function" ||
    typeof interruptController?.request !== "function"
  ) {
    throw new Error("interrupt-cleanup-contract-invalid");
  }

  let cleanupRequested = false;
  const handlers = new Map();
  for (const signal of ["SIGINT", "SIGTERM"]) {
    const handler = () => {
      interruptController.request(signal);
      signalTarget.exitCode = interruptController.exitCode;
      if (cleanupRequested) return;
      cleanupRequested = true;
      const markCleanupFailure = () => {
        if (signalTarget.exitCode !== 130 && signalTarget.exitCode !== 143) {
          signalTarget.exitCode = 3;
        }
      };
      try {
        const result = cleanup({ removeScratch: !isSetup() });
        if (result && typeof result.then === "function") {
          void Promise.resolve(result).catch(markCleanupFailure);
        }
      } catch {
        markCleanupFailure();
      }
    };
    handlers.set(signal, handler);
    signalTarget.on(signal, handler);
  }

  return () => {
    for (const [signal, handler] of handlers) signalTarget.off(signal, handler);
  };
}

export async function stopOwnedProcessGroup(
  child,
  { kill = process.kill, platform = process.platform } = {},
) {
  if (
    platform !== "linux" ||
    child?.healtharchiveProcessGroup !== true ||
    !Number.isInteger(child?.pid) ||
    child.pid <= 1
  ) {
    throw new Error("owned-process-group-proof-missing");
  }

  const groupId = -child.pid;
  signalGroup(kill, groupId, "SIGTERM");
  if (await waitForGroupExit(kill, groupId, GROUP_STOP_GRACE_MS)) return;

  signalGroup(kill, groupId, "SIGKILL");
  if (!(await waitForGroupExit(kill, groupId, GROUP_STOP_KILL_WAIT_MS))) {
    throw new Error("owned-process-group-stop-timeout");
  }
}

function signalGroup(kill, groupId, signal) {
  try {
    kill(groupId, signal);
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

async function waitForGroupExit(kill, groupId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!groupExists(kill, groupId)) return true;
    await new Promise((resolve) => setTimeout(resolve, GROUP_POLL_MS));
  }
  return !groupExists(kill, groupId);
}

function groupExists(kill, groupId) {
  try {
    kill(groupId, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    throw error;
  }
}
