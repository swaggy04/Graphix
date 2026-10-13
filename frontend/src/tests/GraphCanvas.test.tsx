
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";

const { analyzeFileMock, originalNodes } = vi.hoisted(() => ({
  analyzeFileMock: vi.fn(),
  originalNodes: [] as Array<{
    id: string;
    position: { x: number; y: number };
    data: { label: string };
  }>,
}));

vi.mock("../lib/api", () => ({
  analyzeFile: analyzeFileMock,
}));

vi.mock("@xyflow/react", () => ({
  Background: () => null,
  BackgroundVariant: { Dots: "dots" },
  Controls: () => null,
  MarkerType: { ArrowClosed: "arrowclosed" },
  MiniMap: () => null,
  Panel: ({ children }: { children: ReactNode }) => <div>{children}</div>,

  ReactFlow: ({
    nodes,
    onNodeClick,
    children,
  }: {
    nodes: Array<{ id: string; data: Record<string, unknown> }>;
    onNodeClick: (event: unknown, node: unknown) => void;
    children: ReactNode;
  }) => (
    <div>
      {nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          onClick={() => onNodeClick({}, node)}
        >
          {node.id}
        </button>
      ))}

      <button
        type="button"
        onClick={() => {
          const node = originalNodes.find(
            (item) => item.id === "src/App.tsx",
          );
          if (node) onNodeClick({}, node);
        }}
      >
        Select App test node
      </button>

      <button
        type="button"
        onClick={() => {
          const node = originalNodes.find(
            (item) => item.id === "src/utils.ts",
          );
          if (node) onNodeClick({}, node);
        }}
      >
        Select utils test node
      </button>

      {children}
    </div>
  ),

  Position: { Top: "top", Bottom: "bottom" },
  Handle: () => null,

  useReactFlow: () => ({
    setCenter: vi.fn(),
    getNode: (id: string) =>
      originalNodes.find((node) => node.id === id),
    fitView: vi.fn().mockResolvedValue(undefined),
  }),
}));

import GraphCanvas from "../components/GraphCanvas";
import type { FileAnalysisResponse } from "../lib/api";
import type { Edge, Node } from "@xyflow/react";

const testNodes: Node[] = [
  {
    id: "src/App.tsx",
    position: { x: 0, y: 0 },
    data: { label: "App.tsx" },
  },
  {
    id: "src/utils.ts",
    position: { x: 100, y: 100 },
    data: { label: "utils.ts" },
  },
];

originalNodes.push(
  ...testNodes.map((node) => ({
    id: node.id,
    position: node.position,
    data: { label: String(node.data.label ?? "") },
  })),
);

function makeAnalysis(file: string): FileAnalysisResponse {
  return {
    file,
    dependencies: { direct: [], transitive: [] },
    dependents: { direct: [], transitive: [] },
    impact: { affectedFiles: [] },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;

  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("GraphCanvas file selection", () => {
  it("does not let an older request overwrite the latest file analysis", async () => {
    const appRequest = deferred<FileAnalysisResponse>();
    const utilsRequest = deferred<FileAnalysisResponse>();

    analyzeFileMock
      .mockImplementationOnce(() => appRequest.promise)
      .mockImplementationOnce(() => utilsRequest.promise);

    render(
      <GraphCanvas
        nodes={testNodes}
        edges={[] as Edge[]}
        analysisId="analysis-1"
        cycles={[]}
        stats={null}
        repositoryUrl="https://github.com/example/repo"
        setRepositoryUrl={vi.fn()}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        analyzing={false}
      />,
    );

    // Start the first request for App.tsx.
    fireEvent.click(
      screen.getByRole("button", { name: "Select App test node" }),
    );

    // Start a newer request for utils.ts.
    fireEvent.click(
      screen.getByRole("button", { name: "Select utils test node" }),
    );

    await waitFor(() => {
      expect(analyzeFileMock).toHaveBeenCalledTimes(2);
    });

    // Resolve the latest request first with a unique dependency.
    utilsRequest.resolve({
      ...makeAnalysis("src/utils.ts"),
      dependencies: {
        direct: ["src/new-only.ts"],
        transitive: [],
      },
    });

    await waitFor(() => {
      expect(
        screen.getByTitle("Open src/new-only.ts"),
      ).toBeInTheDocument();
    });

    // Resolve the older, potentially stale request afterwards.
    appRequest.resolve({
      ...makeAnalysis("src/App.tsx"),
      dependencies: {
        direct: ["src/old-only.ts"],
        transitive: [],
      },
    });

    // The newer analysis must remain visible.
    await waitFor(() => {
      expect(
        screen.getByTitle("Open src/new-only.ts"),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByTitle("Open src/old-only.ts"),
    ).not.toBeInTheDocument();
  });
});

