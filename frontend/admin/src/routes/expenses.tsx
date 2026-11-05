import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Panel, PanelHead, Td, Th, selectCls } from "@/components/turf/ui-bits";
import { adminFetch, getToken, API_BASE } from "@/lib/api";
import { pageMeta } from "@/lib/meta";
import { inr } from "@/lib/turf-data";
import { EXPENSE_CATEGORY_LABELS, fmtDay, shiftDate, todayLocal } from "@/lib/business";
import { useSubscription } from "@/lib/useSubscription";

export const Route = createFileRoute("/expenses")({
  head: () => pageMeta("Expenses", "Electricity, rent, salaries, maintenance and other running costs."),
  component: ExpensesPage,
});

interface Expense {
  _id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  receipt?: { filename: string; mime_type: string; size: number } | null;
  recordedBy?: { name?: string } | null;
}

interface SummaryResponse {
  period: string;
  buckets: { period: string; total: number; byCategory: Record<string, number> }[];
  total: number;
  totalsByCategory: Record<string, number>;
}

const MAX_RECEIPT = 2 * 1024 * 1024;

const bucketLabel = (period: string, key: string) => {
  if (period === "monthly") return new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
};

function ExpensesPage() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const qc = useQueryClient();
  const { isInactive } = useSubscription();
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [from, setFrom] = useState(shiftDate(todayLocal(), -29));
  const [to, setTo] = useState(todayLocal());
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<Expense | "new" | null>(null);

  const { data: summary } = useQuery({
    queryKey: ["admin-expenses", "summary", period],
    queryFn: () => adminFetch<SummaryResponse>(`/admin/expenses/summary?period=${period}`),
    enabled: isClient,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["admin-expenses", "list", from, to, category],
    queryFn: () =>
      adminFetch<{ expenses: Expense[]; totalAmount: number; byCategory: { category: string; amount: number }[] }>(
        `/admin/expenses?from=${from}&to=${to}&category=${category}&limit=200`,
      ),
    enabled: isClient,
    placeholderData: keepPreviousData,
  });

  const remove = async (e: Expense) => {
    if (!window.confirm(`Delete "${e.title}" (${inr(e.amount)})?`)) return;
    try {
      await adminFetch(`/admin/expenses/${e._id}`, { method: "DELETE" });
      toast.success("Expense deleted");
      qc.invalidateQueries({ queryKey: ["admin-expenses"] });
      qc.invalidateQueries({ queryKey: ["admin-daily-report"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const openReceipt = async (e: Expense) => {
    try {
      const res = await fetch(`${API_BASE}/admin/expenses/${e._id}/receipt`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error("Couldn't load the receipt");
      const url = URL.createObjectURL(await res.blob());
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't open receipt");
    }
  };

  const chartData = (summary?.buckets ?? []).map((b) => ({ label: bucketLabel(summary!.period, b.period), total: b.total }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Expenses"
        desc="Record running costs so the daily report shows what you really made."
        actions={
          <Button size="sm" onClick={() => setEditing("new")} disabled={isInactive} className="gap-1.5">
            <Plus className="size-4" /> Add expense
          </Button>
        }
      />

      <Panel>
        <PanelHead
          title="Spending over time"
          right={
            <div className="flex rounded-md border p-0.5 text-[12px]">
              {(["daily", "weekly", "monthly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded px-2 py-0.5 capitalize ${period === p ? "bg-primary-soft font-medium text-primary-soft-foreground" : "text-muted-foreground"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          }
        />
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_260px]">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)} />
                <Tooltip cursor={{ fill: "var(--secondary)" }} contentStyle={{ fontSize: 12 }} formatter={(v: number) => inr(v)} />
                <Bar dataKey="total" name="Expenses" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="text-[12px] text-muted-foreground">
              {period === "daily" ? "Last 30 days" : period === "weekly" ? "Last 12 weeks" : "Last 12 months"}
            </div>
            <div className="text-[22px] font-semibold tabular-nums">{inr(summary?.total ?? 0)}</div>
            <ul className="mt-2 space-y-1.5">
              {Object.entries(summary?.totalsByCategory ?? {})
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amt]) => (
                  <li key={cat} className="flex justify-between text-[12.5px]">
                    <span>{EXPENSE_CATEGORY_LABELS[cat] ?? cat}</span>
                    <span className="tabular-nums">{inr(amt)}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          From
          <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-8 w-[136px] text-[12.5px]" />
          to
          <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-8 w-[136px] text-[12.5px]" />
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
          <option value="">All categories</option>
          {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <span className="ml-auto text-[13px]">
          Total: <strong className="tabular-nums">{inr(data?.totalAmount ?? 0)}</strong>
        </span>
      </div>

      <Panel className="overflow-x-auto">
        <table className="w-full whitespace-nowrap">
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Title</Th>
              <Th>Category</Th>
              <Th className="text-right">Amount</Th>
              <Th>Receipt</Th>
              <Th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
                </td>
              </tr>
            ) : (
              (data?.expenses ?? []).map((e) => (
                <tr key={e._id} className="hover:bg-surface">
                  <Td className="text-muted-foreground">{fmtDay(e.date)}</Td>
                  <Td>
                    <div className="font-medium">{e.title}</div>
                    {e.description && <div className="max-w-[320px] truncate text-[11.5px] text-muted-foreground">{e.description}</div>}
                  </Td>
                  <Td>{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</Td>
                  <Td className="text-right font-semibold tabular-nums">{inr(e.amount)}</Td>
                  <Td>
                    {e.receipt?.mime_type ? (
                      <button onClick={() => openReceipt(e)} className="flex items-center gap-1 text-[12px] text-primary hover:underline">
                        <Paperclip className="size-3.5" /> View
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <button title="Edit" disabled={isInactive} onClick={() => setEditing(e)} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-40">
                        <Pencil className="size-3.5" />
                      </button>
                      <button title="Delete" disabled={isInactive} onClick={() => remove(e)} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-destructive disabled:opacity-40">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
            {!isLoading && !data?.expenses.length && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-[13px] text-muted-foreground">
                  No expenses in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>

      <ExpenseDialog value={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function ExpenseDialog({ value, onClose }: { value: Expense | "new" | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isNew = value === "new";
  const [f, setF] = useState({ title: "", category: "electricity", amount: "", date: todayLocal(), description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!value) return;
    setFile(null);
    setRemoveReceipt(false);
    if (value === "new") setF({ title: "", category: "electricity", amount: "", date: todayLocal(), description: "" });
    else setF({ title: value.title, category: value.category, amount: String(value.amount), date: value.date.slice(0, 10), description: value.description });
  }, [value]);

  const readFile = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("Couldn't read the file"));
      r.readAsDataURL(f);
    });

  const save = async () => {
    if (file && file.size > MAX_RECEIPT) {
      toast.error("Receipt must be 2 MB or smaller");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...f, amount: Number(f.amount) };
      if (file) body["receipt"] = { filename: file.name, mime_type: file.type, data: await readFile(file) };
      else if (removeReceipt) body["receipt"] = null;
      await adminFetch(isNew ? "/admin/expenses" : `/admin/expenses/${(value as Expense)._id}`, {
        method: isNew ? "POST" : "PATCH",
        body: JSON.stringify(body),
      });
      toast.success(isNew ? "Expense recorded" : "Expense updated");
      qc.invalidateQueries({ queryKey: ["admin-expenses"] });
      qc.invalidateQueries({ queryKey: ["admin-daily-report"] });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const existingReceipt = !isNew && value && (value as Expense).receipt?.mime_type;

  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add expense" : "Edit expense"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Electricity bill – October" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={selectCls + " h-9 w-full"}>
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input type="number" min={1} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" max={todayLocal()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Receipt (optional — photo or PDF, max 2 MB)</Label>
            <Input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {existingReceipt && !file && (
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <input type="checkbox" checked={removeReceipt} onChange={(e) => setRemoveReceipt(e.target.checked)} />
                Remove current receipt ({(value as Expense).receipt?.filename})
              </label>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
