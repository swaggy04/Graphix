"use client";

import type { Node } from "@xyflow/react";
import type { FileAnalysisResponse } from "../lib/api";

interface FileInspectorProps {
  selectedNode: Node;
  fileAnalysis: FileAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onFileClick: (filePath: string) => void;
}

export default function FileInspector({ selectedNode, fileAnalysis, loading, error, onClose, onFileClick }: FileInspectorProps) {
  return (
    <aside className="flex max-h-[min(620px,calc(100vh-104px))] w-[300px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#111114]/96 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
      <div className="shrink-0 border-b border-zinc-800/80 px-3.5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">File inspector</div>
            <div className="break-all text-sm font-medium leading-5 text-zinc-100">{getFileName(selectedNode.id)}</div>
            <div className="mt-1 break-all text-[10px] leading-4 text-zinc-600">{selectedNode.id}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close inspector" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300">×</button>
        </div>
      </div>

      {loading && <div className="px-4 py-8 text-xs text-zinc-500">Analyzing dependency relationships...</div>}
      {error && !loading && <div className="border-b border-zinc-800/80 px-4 py-4"><div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-[10px] leading-4 text-zinc-400">{error}</div></div>}

      {fileAnalysis && !loading && !error && (
        <div className="grid grid-cols-3 gap-2 border-b border-zinc-800/80 px-4 py-3">
          <InspectorMetric label="Depends on" value={fileAnalysis.dependencies.direct.length} />
          <InspectorMetric label="Used by" value={fileAnalysis.dependents.direct.length} />
          <InspectorMetric label="Impact" value={fileAnalysis.impact.affectedFiles.length} />
        </div>
      )}

      {fileAnalysis && !loading && (
        <div className="min-h-0 flex-1 overflow-y-auto grapix-inspector-scroll">
          <AnalysisSection title="Dependencies" direct={fileAnalysis.dependencies.direct} transitive={fileAnalysis.dependencies.transitive} onFileClick={onFileClick} />
          <AnalysisSection title="Dependents" direct={fileAnalysis.dependents.direct} transitive={fileAnalysis.dependents.transitive} onFileClick={onFileClick} />
          <section className="border-t border-zinc-800/80 px-4 py-4">
            <div className="mb-3 flex items-center justify-between"><div><div className="text-xs font-semibold text-zinc-200">Impact</div><div className="mt-0.5 text-[10px] text-zinc-600">Files affected by this module</div></div><span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-medium tabular-nums text-zinc-500">{fileAnalysis.impact.affectedFiles.length}</span></div>
            {fileAnalysis.impact.affectedFiles.length === 0 ? <EmptyText text="No affected files." /> : <FileList files={fileAnalysis.impact.affectedFiles} onFileClick={onFileClick} />}
          </section>
        </div>
      )}
    </aside>
  );
}

function AnalysisSection({ title, direct, transitive, onFileClick }: { title: string; direct: string[]; transitive: string[]; onFileClick: (filePath: string) => void }) {
  const total = new Set([...direct, ...transitive]).size;

  return (
    <section className="border-b border-zinc-800/80 px-4 py-3.5">
      <div className="mb-3 flex items-center justify-between"><div><div className="text-xs font-semibold text-zinc-200">{title}</div><div className="mt-0.5 text-[10px] text-zinc-600">Direct and transitive relationships</div></div><span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-medium tabular-nums text-zinc-500">{total}</span></div>
      <div><div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Direct</div>{direct.length === 0 ? <EmptyText text="None" /> : <FileList files={direct} onFileClick={onFileClick} />}</div>
      <details className="group mt-4"><summary className="flex cursor-pointer list-none items-center justify-between text-[9px] font-semibold uppercase tracking-wider text-zinc-600 transition hover:text-zinc-300"><span>Transitive</span><span className="flex items-center gap-2 normal-case tracking-normal text-zinc-700">{transitive.length}<span className="text-xs transition group-open:rotate-180">⌄</span></span></summary><div className="mt-2">{transitive.length === 0 ? <EmptyText text="None" /> : <FileList files={transitive} onFileClick={onFileClick} />}</div></details>
    </section>
  );
}

function FileList({ files, onFileClick }: { files: string[]; onFileClick: (filePath: string) => void }) {
  return <div className="grapix-inspector-scroll max-h-32 space-y-1 overflow-y-auto pr-1">{files.map((file) => <button key={file} type="button" title={`Open ${file}`} onClick={() => onFileClick(file)} className="block w-full rounded-lg border border-zinc-800/80 bg-[#0c0c0f] px-2.5 py-2 text-left text-[10px] leading-4 text-zinc-500 transition hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-200"><span className="line-clamp-2 break-all">{file}</span></button>)}</div>;
}

function EmptyText({ text }: { text: string }) { return <p className="text-[10px] text-zinc-700">{text}</p>; }

function InspectorMetric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-zinc-800/80 bg-[#0c0c0f] px-2 py-2"><div className="text-[9px] uppercase tracking-wider text-zinc-600">{label}</div><div className="mt-1 text-sm font-semibold tabular-nums text-zinc-200">{value.toLocaleString()}</div></div>; }

function getFileName(filePath: string) { return filePath.replace(/\\/g, "/").split("/").pop() ?? filePath; }
