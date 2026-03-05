import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableDownload } from "@/components/table-download";
import { motion } from "framer-motion";
import {
  Table, ChevronLeft, ChevronRight, Loader2, Search, Database,
  ChevronsLeft, ChevronsRight,
} from "lucide-react";

interface DatasetViewerProps {
  corpusId: string;
  theme?: { gradient: string; accent: string; text: string };
}

interface DatasetPage {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  page: number;
  totalPages: number;
}

export function DatasetViewer({ corpusId, theme }: DatasetViewerProps) {
  const [data, setData] = useState<DatasetPage | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightCol, setHighlightCol] = useState<string | null>(null);
  const pageSize = 50;

  const gradient = theme?.gradient || "from-indigo-500 to-blue-600";
  const textColor = theme?.text || "text-indigo-600 dark:text-indigo-400";

  const fetchMutation = useMutation({
    mutationFn: async (p: number) => {
      const res = await apiRequest("POST", "/api/corpus/dataset", { corpusId, page: p, pageSize });
      return res.json();
    },
    onSuccess: (result: DatasetPage) => {
      setData(result);
    },
  });

  useEffect(() => {
    fetchMutation.mutate(page);
  }, [corpusId, page]);

  const highlightText = (text: string) => {
    if (!searchTerm.trim()) return text;
    const idx = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">{text.slice(idx, idx + searchTerm.length)}</mark>
        {text.slice(idx + searchTerm.length)}
      </>
    );
  };

  if (!data && fetchMutation.isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading dataset...</span>
      </div>
    );
  }

  if (!data || data.headers.length === 0) {
    return (
      <div className="polished-card p-8 text-center">
        <Database className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No structured dataset available. Upload an Excel file to see your data here.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="polished-card overflow-hidden">
        <div className={`h-1 bg-gradient-to-r ${gradient}`} />
        <div className="p-4">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
                <Table className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${textColor}`} style={{ fontFamily: "'Playfair Display', serif" }}>Dataset Preview</h3>
                <p className="text-[11px] text-muted-foreground">{data.totalRows.toLocaleString()} rows · {data.headers.length} columns</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Highlight text..."
                  className="h-8 text-xs pl-8 w-44"
                  data-testid="input-dataset-search"
                />
              </div>
              <TableDownload
                data={data.rows.map((row, i) => {
                  const obj: Record<string, any> = { "#": (page - 1) * pageSize + i + 1 };
                  data.headers.forEach(h => { obj[h] = row[h] ?? ""; });
                  return obj;
                })}
                columns={[
                  { header: "#", key: "#", align: "left" as const },
                  ...data.headers.map(h => ({ header: h, key: h, align: "left" as const })),
                ]}
                filename="Dataset"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-xs polished-table" data-testid="table-dataset">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 text-left text-muted-foreground font-semibold w-12 bg-muted/80 backdrop-blur-sm border-b">#</th>
                    {data.headers.map((h) => (
                      <th
                        key={h}
                        className={`py-2.5 px-3 text-left font-semibold border-b cursor-pointer transition-colors whitespace-nowrap ${
                          highlightCol === h
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            : "bg-muted/80 backdrop-blur-sm hover:bg-muted"
                        }`}
                        onClick={() => setHighlightCol(highlightCol === h ? null : h)}
                        data-testid={`th-${h.replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 text-muted-foreground/60 tabular-nums font-mono">{(page - 1) * pageSize + i + 1}</td>
                      {data.headers.map((h) => (
                        <td
                          key={h}
                          className={`py-2 px-3 max-w-[300px] truncate ${
                            highlightCol === h ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                          }`}
                          title={String(row[h] ?? "")}
                        >
                          {highlightText(String(row[h] ?? ""))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
              <span className="text-[11px] text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, data.totalRows)} of {data.totalRows.toLocaleString()} rows
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page <= 1 || fetchMutation.isPending}
                  className="h-7 w-7 p-0"
                  data-testid="button-first-page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1 || fetchMutation.isPending}
                  className="h-7 w-7 p-0"
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs font-medium px-3 tabular-nums">
                  {page} / {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages || fetchMutation.isPending}
                  className="h-7 w-7 p-0"
                  data-testid="button-next-page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(data.totalPages)}
                  disabled={page >= data.totalPages || fetchMutation.isPending}
                  className="h-7 w-7 p-0"
                  data-testid="button-last-page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
