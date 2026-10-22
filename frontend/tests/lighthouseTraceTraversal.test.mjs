import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const lighthouseRoot = path.resolve("node_modules/lighthouse");
const require = createRequire(import.meta.url);
const { parsePatchFile } = require("patch-package/dist/patch/parse");

async function loadTraceElements() {
  const moduleUrl = pathToFileURL(
    path.join(lighthouseRoot, "core/gather/gatherers/trace-elements.js"),
  );
  return (await import(moduleUrl)).default;
}

async function loadTraceEngineResult() {
  const moduleUrl = pathToFileURL(
    path.join(lighthouseRoot, "core/computed/trace-engine-result.js"),
  );
  return (await import(moduleUrl)).TraceEngineResult;
}

async function loadProcessedTrace() {
  const moduleUrl = pathToFileURL(path.join(lighthouseRoot, "core/computed/processed-trace.js"));
  return (await import(moduleUrl)).ProcessedTrace;
}

function traceEngineResultForModel(model) {
  return {
    insights: new Map([
      [
        "navigation",
        {
          model: {
            CLSCulprits: { shifts: new Map() },
            ...model,
          },
        },
      ],
    ]),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pinned Lighthouse trace model traversal", () => {
  it("parses every frontend patch with the installed patch-package parser", () => {
    const patchDirectory = path.resolve("patches");
    const patchFilenames = fs
      .readdirSync(patchDirectory)
      .filter((filename) => filename.endsWith(".patch"));

    expect(patchFilenames).not.toHaveLength(0);
    for (const patchFilename of patchFilenames) {
      const patchText = fs.readFileSync(path.join(patchDirectory, patchFilename), "utf8");
      const effects = parsePatchFile(patchText);

      expect(effects, patchFilename).not.toHaveLength(0);
    }
  });

  it("visits a shared trace node only once while collecting node IDs", async () => {
    const TraceElements = await loadTraceElements();
    let nodeIdReads = 0;
    const shared = {};
    Object.defineProperty(shared, "nodeId", {
      enumerable: true,
      get() {
        nodeIdReads += 1;
        return 42;
      },
    });

    const elements = await TraceElements.getTraceEngineElements(
      traceEngineResultForModel({ firstInsight: shared, secondInsight: shared }),
      undefined,
    );

    expect(elements).toEqual([{ nodeId: 42 }]);
    // The traversal reads each scalar property once to inspect its type and once
    // to pass its value to the callback. A repeated visit would double this count.
    expect(nodeIdReads).toBe(2);
  });

  it("preserves nested node collection and localization for ordinary trees", async () => {
    const TraceElements = await loadTraceElements();
    const elements = await TraceElements.getTraceEngineElements(
      traceEngineResultForModel({ nestedInsight: { affectedNode: { node_id: 7 } } }),
      undefined,
    );

    expect(elements).toEqual([{ nodeId: 7 }]);

    const TraceEngineResult = await loadTraceEngineResult();
    const localizedMessage = { formattedDefault: "localized label" };
    const model = { label: { i18nId: "test.label", values: { count: 1 } } };
    TraceEngineResult.localizeObject(() => localizedMessage, model);

    expect(model.label).toBe(localizedMessage);
  });

  it("limits concurrent node lookups and preserves deterministic output on failures", async () => {
    const [TraceElements, TraceEngineResult, ProcessedTrace] = await Promise.all([
      loadTraceElements(),
      loadTraceEngineResult(),
      loadProcessedTrace(),
    ]);
    const traceEngineResult = {
      insights: new Map(),
      data: { LayoutShifts: { clusters: [] } },
    };
    vi.spyOn(TraceEngineResult, "request").mockResolvedValue(traceEngineResult);
    vi.spyOn(ProcessedTrace, "request").mockResolvedValue({
      mainThreadEvents: [],
      timeOriginEvt: { args: { data: { navigationId: "nav" } } },
    });
    vi.spyOn(TraceElements, "getTraceEngineElements").mockResolvedValue(
      [1, 2, 3, 4, 5, 6].map((nodeId) => ({ nodeId })),
    );
    vi.spyOn(TraceElements, "getLcpElement").mockResolvedValue({ nodeId: 2, type: "image" });
    vi.spyOn(TraceElements, "getTopLayoutShifts").mockResolvedValue([{ nodeId: 7 }, { nodeId: 3 }]);
    vi.spyOn(TraceElements, "getResponsivenessElement").mockResolvedValue({ nodeId: 8 });

    let activeCommands = 0;
    let maxActiveCommands = 0;
    const resolveCompletionOrder = [];
    const requestedNodeIds = [];
    const session = {
      async sendCommand(method, params) {
        const nodeId =
          method === "DOM.resolveNode"
            ? params.backendNodeId
            : Number(params.objectId.slice("object-".length));
        activeCommands += 1;
        maxActiveCommands = Math.max(maxActiveCommands, activeCommands);
        try {
          requestedNodeIds.push(`${method}:${nodeId}`);
          if (method === "DOM.resolveNode") {
            await new Promise((resolve) => setTimeout(resolve, nodeId === 1 ? 25 : 2));
            return { object: { objectId: `object-${nodeId}` } };
          }

          await new Promise((resolve) => setTimeout(resolve, 1));
          if (nodeId === 3) throw new Error("synthetic node lookup rejection");
          resolveCompletionOrder.push(nodeId);
          return { result: { value: { tagName: `node-${nodeId}` } } };
        } finally {
          activeCommands -= 1;
        }
      },
    };
    const gatherer = new TraceElements();
    vi.spyOn(gatherer, "getAnimatedElements").mockResolvedValue([
      { nodeId: 7, animations: [{ name: "fade" }] },
    ]);

    const elements = await gatherer.getArtifact({
      driver: { defaultSession: session },
      dependencies: { Trace: { traceEvents: [] }, SourceMaps: [] },
      settings: {},
      gatherMode: "navigation",
      computedCache: new Map(),
    });

    expect(maxActiveCommands).toBe(4);
    expect(resolveCompletionOrder.indexOf(2)).toBeLessThan(resolveCompletionOrder.indexOf(1));
    expect(requestedNodeIds.filter((request) => request.startsWith("DOM.resolveNode:"))).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8].map((nodeId) => `DOM.resolveNode:${nodeId}`),
    );
    expect(
      elements.map(({ traceEventType, nodeId, tagName }) => [traceEventType, nodeId, tagName]),
    ).toEqual([
      ["trace-engine", 1, "node-1"],
      ["trace-engine", 2, "node-2"],
      ["trace-engine", 4, "node-4"],
      ["trace-engine", 5, "node-5"],
      ["trace-engine", 6, "node-6"],
      ["largest-contentful-paint", 2, "node-2"],
      ["layout-shift", 7, "node-7"],
      ["animation", 7, "node-7"],
      ["responsiveness", 8, "node-8"],
    ]);
  });

  it("stops scheduling after an unexpected lookup rejection and waits for in-flight work", async () => {
    const [TraceElements, TraceEngineResult, ProcessedTrace] = await Promise.all([
      loadTraceElements(),
      loadTraceEngineResult(),
      loadProcessedTrace(),
    ]);
    vi.spyOn(TraceEngineResult, "request").mockResolvedValue({ insights: new Map(), data: {} });
    vi.spyOn(ProcessedTrace, "request").mockResolvedValue({
      mainThreadEvents: [],
      timeOriginEvt: { args: { data: { navigationId: "nav" } } },
    });
    vi.spyOn(TraceElements, "getTraceEngineElements").mockResolvedValue(
      [1, 2, 3, 4, 5, 6].map((nodeId) => ({ nodeId })),
    );
    vi.spyOn(TraceElements, "getLcpElement").mockResolvedValue(undefined);
    vi.spyOn(TraceElements, "getTopLayoutShifts").mockResolvedValue([]);
    vi.spyOn(TraceElements, "getResponsivenessElement").mockResolvedValue(undefined);

    let releaseInitialBatch;
    const initialBatchStarted = new Promise((resolve) => {
      releaseInitialBatch = resolve;
    });
    let activeLookups = 0;
    let requestedNodeIds = 0;
    const rejection = new Error("unexpected synthetic lookup rejection");
    const gatherer = new TraceElements();
    vi.spyOn(gatherer, "getAnimatedElements").mockResolvedValue([]);
    vi.spyOn(gatherer, "getNodeDetails").mockImplementation(async (_session, nodeId) => {
      activeLookups += 1;
      requestedNodeIds += 1;
      if (requestedNodeIds === 4) releaseInitialBatch();
      try {
        await initialBatchStarted;
        if (nodeId === 1) throw rejection;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return null;
      } finally {
        activeLookups -= 1;
      }
    });

    await expect(
      gatherer.getArtifact({
        driver: { defaultSession: {} },
        dependencies: { Trace: { traceEvents: [] }, SourceMaps: [] },
        settings: {},
        gatherMode: "navigation",
        computedCache: new Map(),
      }),
    ).rejects.toBe(rejection);

    expect(requestedNodeIds).toBe(4);
    expect(activeLookups).toBe(0);
  });

  it("terminates on cyclic trace and localization models", async () => {
    const TraceElements = await loadTraceElements();
    const cyclicTraceModel = {};
    cyclicTraceModel.self = cyclicTraceModel;

    await expect(
      TraceElements.getTraceEngineElements(
        traceEngineResultForModel({ cyclic: cyclicTraceModel }),
        undefined,
      ),
    ).resolves.toEqual([]);

    const TraceEngineResult = await loadTraceEngineResult();
    const cyclicLocalizationModel = {};
    cyclicLocalizationModel.self = cyclicLocalizationModel;

    expect(() =>
      TraceEngineResult.localizeObject((id) => ({ formattedDefault: id }), cyclicLocalizationModel),
    ).not.toThrow();
  });
});
