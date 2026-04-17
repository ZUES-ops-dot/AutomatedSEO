import type { ImportTemplate, ParsedImportPreview } from "@/features/seo/types";

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function detectTemplate(headers: string[], templates: ImportTemplate[]) {
  const normalizedHeaders = headers.map(normalizeHeader);

  return (
    templates.find((template) =>
      template.requiredFields.every((field) => normalizedHeaders.includes(field))
    ) ?? null
  );
}

export function buildTemplateCsv(template: ImportTemplate) {
  const headers = [...template.requiredFields, ...template.optionalFields];
  const rows = template.sampleRows.map((row) =>
    headers.map((header) => row[header] ?? "").join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

export function validateImportRows(
  headers: string[],
  rows: Array<Record<string, string>>,
  templates: ImportTemplate[]
): ParsedImportPreview {
  const template = detectTemplate(headers, templates);
  const normalizedHeaders = headers.map(normalizeHeader);
  const issues: ParsedImportPreview["issues"] = [];

  const activeTemplate = template;

  if (!activeTemplate) {
    return {
      template: null,
      detectedTemplateId: "custom",
      totalRows: rows.length,
      validRows: 0,
      invalidRows: rows.length,
      headers: normalizedHeaders,
      issues: [
        {
          row: 0,
          severity: "error",
          message: "No supported template was detected from the uploaded columns."
        }
      ],
      preview: rows.slice(0, 5)
    };
  }

  rows.forEach((row, index) => {
    activeTemplate.requiredFields.forEach((field) => {
      const value = row[field] ?? row[field.toUpperCase()] ?? row[field.toLowerCase()] ?? "";

      if (!String(value).trim()) {
        issues.push({
          row: index + 1,
          severity: "error",
          message: `Missing required field \`${field}\`.`
        });
      }
    });

    if (activeTemplate.id === "urls") {
      const rawUrl = row.url ?? row.URL ?? "";
      if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
        issues.push({
          row: index + 1,
          severity: "warning",
          message: "URL should include the full protocol, for example https://qubic.org/page."
        });
      }
    }
  });

  const invalidRows = new Set(issues.filter((issue) => issue.row > 0).map((issue) => issue.row)).size;

  return {
    template: activeTemplate,
    detectedTemplateId: activeTemplate.id,
    totalRows: rows.length,
    validRows: Math.max(0, rows.length - invalidRows),
    invalidRows,
    headers: normalizedHeaders,
    issues,
    preview: rows.slice(0, 5)
  };
}
