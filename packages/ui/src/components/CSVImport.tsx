import * as React from "react";

export function CSVImport({ onImport }: { onImport: (rows: Record<string, string>[]) => void }) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length === 0) return;
      const headers = lines[0]!.split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || "";
        });
        return row;
      });
      onImport(rows);
    };
    reader.readAsText(file);
  };
  return (
    <div>
      <input type="file" accept=".csv,.xlsx" ref={fileInputRef} onChange={handleFile} className="hidden" />
      <button className="px-3 py-1 text-sm border rounded" onClick={() => fileInputRef.current?.click()}>
        Import CSV
      </button>
    </div>
  );
}
