import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import FileInspector from "../components/FileInspector";
import type { FileAnalysisResponse } from "../lib/api";
import type { Node } from "@xyflow/react";

const selectedNode = {
  id: "src/components/App.tsx",
  position: { x: 0, y: 0 },
  data: { label: "App.tsx" },
} as Node;

const fileAnalysis: FileAnalysisResponse = {
  file: "src/components/App.tsx",
  dependencies: {
    direct: ["src/utils.ts"],
    transitive: [],
  },
  dependents: {
    direct: ["src/main.tsx"],
    transitive: [],
  },
  impact: {
    affectedFiles: ["src/main.tsx"],
  },
};

describe("FileInspector", () => {
  it("shows the selected file and its dependency relationships", () => {
    render(
      <FileInspector
        selectedNode={selectedNode}
        fileAnalysis={fileAnalysis}
        loading={false}
        error={null}
        onClose={vi.fn()}
        onFileClick={vi.fn()}
      />,
    );

    expect(screen.getByText("File inspector")).toBeInTheDocument();
    expect(screen.getByText("App.tsx")).toBeInTheDocument();
    expect(screen.getByText("src/components/App.tsx")).toBeInTheDocument();
    expect(screen.getByTitle("Open src/utils.ts")).toBeInTheDocument();
    expect(screen.getAllByTitle("Open src/main.tsx")).toHaveLength(2);
    expect(screen.getByText("Depends on")).toBeInTheDocument();
    expect(screen.getByText("Used by")).toBeInTheDocument();
    expect(screen.getAllByText("Impact")).toHaveLength(2);
  });

  it("calls onFileClick when a dependency is clicked", () => {
    const onFileClick = vi.fn();

    render(
      <FileInspector
        selectedNode={selectedNode}
        fileAnalysis={fileAnalysis}
        loading={false}
        error={null}
        onClose={vi.fn()}
        onFileClick={onFileClick}
      />,
    );

    fireEvent.click(screen.getByTitle("Open src/utils.ts"));

    expect(onFileClick).toHaveBeenCalledWith("src/utils.ts");
  });

  it("shows the loading state while analyzing", () => {
    render(
      <FileInspector
        selectedNode={selectedNode}
        fileAnalysis={null}
        loading={true}
        error={null}
        onClose={vi.fn()}
        onFileClick={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Analyzing dependency relationships..."),
    ).toBeInTheDocument();
  });
});
