"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "./States";

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  empty,
  searchPlaceholder = "Search",
}: {
  data: T[];
  columns: ColumnDef<T>[];
  empty: string;
  searchPlaceholder?: string;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const rowCount = useMemo(() => table.getRowModel().rows.length, [table, globalFilter, sorting]);

  if (!data.length) return <EmptyState title={empty} />;

  return (
    <div className="space-y-3">
      <label className="flex max-w-md items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          className="w-full border-0 bg-transparent outline-none"
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder={searchPlaceholder}
        />
      </label>
      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 font-semibold">
                    {header.isPlaceholder ? null : (
                      <button type="button" className="max-w-full truncate" onClick={header.column.getToggleSortingHandler()}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rowCount === 0 ? (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={columns.length}>
                  No rows match the current filter.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="truncate px-3 py-2 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
