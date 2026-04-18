"use client";

import Papa from "papaparse";
import { useState, type ChangeEvent } from "react";

import type { ParsedImportPreview } from "@/features/seo/types";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { importTemplates } from "@/features/seo/data/demo-data";
import { buildTemplateCsv, validateImportRows } from "@/features/seo/lib/imports";

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function ImportsCenter() {
  const [preview, setPreview] = useState<ParsedImportPreview | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [parsedImport, setParsedImport] = useState<{
    headers: string[];
    rows: Array<Record<string, string>>;
  } | null>(null);
  const [downstreamLoading, setDownstreamLoading] = useState<string | null>(null);
  const [downstreamMessage, setDownstreamMessage] = useState<string | null>(null);

  function downloadTemplate(templateId: string) {
    const template = importTemplates.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    const blob = new Blob([buildTemplateCsv(template)], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${template.id}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function handleFileChange(file: File | null) {
    if (!file) {
      setFileName("");
      setPreview(null);
      setParsedImport(null);
      setDownstreamMessage(null);
      return;
    }

    setFileName(file.name);
    setDownstreamMessage(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = (results.meta.fields ?? []).map(normalizeHeader);
        const rows = results.data.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? "").trim()])
          )
        );

        setParsedImport({ headers, rows });
        setPreview(validateImportRows(headers, rows, importTemplates));
      }
    });
  }

  function normalizeRowWhitespace() {
    if (!parsedImport) {
      return;
    }

    const rows = parsedImport.rows.map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value.trim()]))
    );
    setParsedImport({ ...parsedImport, rows });
    setPreview(validateImportRows(parsedImport.headers, rows, importTemplates));
  }

  async function runGenerateOpportunities() {
    setDownstreamLoading("opportunities");
    setDownstreamMessage(null);
    try {
      const res = await fetch("/api/suggestions", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { opportunities?: unknown[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Request failed.");
      }
      const count = Array.isArray(data.opportunities) ? data.opportunities.length : 0;
      setDownstreamMessage(`Regenerated opportunity feed (${count} items). Refresh the suggestions page to see updates.`);
    } catch (error) {
      setDownstreamMessage(error instanceof Error ? error.message : "Failed to regenerate opportunities.");
    } finally {
      setDownstreamLoading(null);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFileChange(event.target.files?.[0] ?? null);
  }

  return (
    <div className="space-y-6">
      <Panel
        title="What you can import here"
        subtitle="Bulk-load keywords, URLs, or search performance rows to seed opportunities without waiting for a live API sync. Pick a template below, download the blank CSV, fill it in, then upload it."
      >
        <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.04] p-4">
          <p className="text-sm text-white/70">
            <strong className="text-cyan-200">Why this exists:</strong> If you want to supplement Morningscore or work offline, you can import keyword and performance data from any source — Bing Webmaster exports, Ahrefs, SEMrush, or manual keyword lists. The app treats imported rows the same as synced API data.
          </p>
        </div>
      </Panel>

      <Panel title="Available templates" subtitle="Start from a known schema so validation and downstream jobs stay deterministic.">
        <div className="grid gap-4 xl:grid-cols-2">
          {importTemplates.map((template) => (
            <div key={template.id} className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="cyan">{template.name}</Badge>
                    <Badge tone="slate">{template.requiredFields.length} required fields</Badge>
                  </div>
                  <h3 className="mt-3 font-semibold text-white">{template.description}</h3>
                </div>
                <button
                  onClick={() => downloadTemplate(template.id)}
                  className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100"
                >
                  Download CSV
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {template.requiredFields.map((field) => (
                  <Badge key={field} tone="cyan">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <Panel title="Upload and validate" subtitle="Preview structure before any import job mutates the system state.">
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-black/20 px-6 py-12 text-center transition hover:border-cyan-400/30 hover:bg-cyan-400/5">
              <span className="text-base font-medium text-white">Drop a CSV here or click to browse</span>
              <span className="mt-2 text-sm text-slate-400">
                Keywords and URL inventories work best as the first seed datasets.
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleInputChange}
              />
            </label>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">Current upload</p>
                  <p className="mt-1 text-sm text-slate-300">{fileName || "No file selected yet"}</p>
                </div>
                {preview ? <Badge tone={preview.invalidRows > 0 ? "amber" : "lime"}>{preview.detectedTemplateId}</Badge> : null}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-medium text-white">Downstream triggers</p>
              {downstreamMessage && (
                <p className="mt-3 text-xs text-slate-400" role="status">
                  {downstreamMessage}
                </p>
              )}
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={!parsedImport || downstreamLoading !== null}
                  onClick={normalizeRowWhitespace}
                  className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 disabled:opacity-40"
                >
                  Normalize rows
                </button>
                <button
                  type="button"
                  disabled={downstreamLoading !== null}
                  onClick={runGenerateOpportunities}
                  className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 disabled:opacity-40"
                >
                  {downstreamLoading === "opportunities" ? "Running…" : "Generate opportunities"}
                </button>
                <button
                  type="button"
                  disabled
                  title="Not implemented: requires persisting imports and a tagging pipeline."
                  className="rounded-2xl border border-lime-400/20 bg-lime-500/10 px-4 py-3 text-sm font-medium text-lime-100 opacity-50"
                >
                  Attach source tags
                </button>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Validation preview" subtitle="Preserve row-level errors, required-field gaps, and template detection results.">
          {preview ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Rows</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{preview.totalRows}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Valid</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{preview.validRows}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Invalid</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{preview.invalidRows}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-medium text-white">Detected columns</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {preview.headers.map((header) => (
                    <Badge key={header} tone="slate">
                      {header}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-medium text-white">Issues</p>
                <div className="mt-4 space-y-3">
                  {preview.issues.length > 0 ? (
                    preview.issues.map((issue, index) => (
                      <div key={`${issue.row}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                        <span className="font-medium text-white">Row {issue.row}</span>
                        <span className="mx-2 text-slate-500">·</span>
                        <span>{issue.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-lime-400/20 bg-lime-500/10 p-3 text-sm text-lime-50/90">
                      No validation issues were detected for this upload.
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20">
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-medium text-white">Preview rows</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-300">
                    <thead className="bg-white/5 text-xs uppercase tracking-[0.24em] text-slate-500">
                      <tr>
                        {preview.headers.map((header) => (
                          <th key={header} className="px-4 py-3 font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-t border-white/10">
                          {preview.headers.map((header) => (
                            <td key={`${rowIndex}-${header}`} className="px-4 py-3 align-top text-slate-200">
                              {row[header] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-slate-400">
              Upload a CSV to preview template detection, row-level validation, and downstream readiness.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
