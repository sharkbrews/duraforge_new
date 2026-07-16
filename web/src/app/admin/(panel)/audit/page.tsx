import { getAuditLogs } from "@/lib/audit";

function actionTone(action: string): string {
  if (action.includes("failed") || action.includes("denied")) {
    return "bg-red-100 text-red-700";
  }
  if (action.includes("success") || action.includes("login")) {
    return "bg-success/15 text-success";
  }
  return "bg-navy/10 text-navy";
}

export default async function AdminAuditPage() {
  const logs = await getAuditLogs();

  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold text-navy">Audit log</h2>
      <p className="mt-1 text-sm text-slate-brand">
        Every admin action, login, and blocked attempt — newest first.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-brand">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Detail</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-slate-brand">
                  {new Date(log.createdAt).toLocaleString("en-GB")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${actionTone(log.action)}`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-brand">{log.actorEmail ?? "—"}</td>
                <td className="px-4 py-3 text-slate-brand">{log.detail ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-brand">
                  {log.ip ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <p className="p-8 text-center text-slate-brand">No audit entries yet.</p>
        )}
      </div>
    </div>
  );
}
