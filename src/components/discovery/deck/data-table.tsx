import type { ReactNode } from "react";

interface DataTableProps {
  heads: string[];
  rows: ReactNode[][];
}

export function DataTable({ heads, rows }: DataTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse mb-2.5">
        <thead>
          <tr>
            {heads.map((h, i) => (
              <th
                key={i}
                className="text-left px-1.5 py-1.5 border-b border-[#e5e7eb] text-[#6b7280] font-medium"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td
                  key={j}
                  className="px-1.5 py-1.5 border-b border-[#f3f4f6] text-[#111827] align-top"
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
