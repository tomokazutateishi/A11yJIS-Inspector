// src/ui/ui.ts
var ALLOWED_ORIGINS = /* @__PURE__ */ new Set(["https://www.figma.com", "null"]);
var isPluginMessage = (msg) => {
  if (!msg || typeof msg !== "object") return false;
  if (!("type" in msg) || typeof msg.type !== "string") {
    return false;
  }
  const type = msg.type;
  return type === "summary" || type === "warning";
};
var $ = (sel) => document.querySelector(sel);
var kpiCount = $("#kpi-count");
var kpiErrors = $("#kpi-errors");
var kpiWarns = $("#kpi-warns");
var cntContrast = $("#cnt-contrast");
var cntAlt = $("#cnt-alt");
var cntTouch = $("#cnt-touch");
var warningsBox = $("#warnings");
var listBox = $("#list");
var latestPayload = null;
function download(filename, content, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function updateKpis(payload) {
  latestPayload = payload;
  if (kpiCount) kpiCount.textContent = String(payload.summary.nodeCount);
  if (kpiErrors) kpiErrors.textContent = String(payload.summary.errorCount);
  if (kpiWarns) kpiWarns.textContent = String(payload.summary.warnCount);
  if (cntContrast) cntContrast.textContent = String(payload.summary.perType["contrast"] || 0);
  if (cntAlt) cntAlt.textContent = String(payload.summary.perType["altText"] || 0);
  if (cntTouch) cntTouch.textContent = String(payload.summary.perType["touchTarget"] || 0);
  renderList(payload.rows);
}
window.addEventListener("message", (e) => {
  try {
    if (e.source && e.source !== window.parent) return;
    if (e.origin && !ALLOWED_ORIGINS.has(e.origin)) return;
    const data = e.data;
    if (!data || !data.pluginMessage) return;
    const pluginMessage = data.pluginMessage;
    if (!isPluginMessage(pluginMessage)) {
      if (typeof console !== "undefined" && typeof console.debug === "function") {
        const type = pluginMessage == null ? void 0 : pluginMessage.type;
        console.debug("[UI] Unknown message type:", type);
      }
      return;
    }
    if (pluginMessage.type === "summary") {
      if (!pluginMessage.payload || typeof pluginMessage.payload !== "object") return;
      updateKpis(pluginMessage.payload);
      if (warningsBox) warningsBox.textContent = pluginMessage.warning || "";
    } else if (pluginMessage.type === "warning") {
      if (typeof pluginMessage.message !== "string") return;
      if (warningsBox) warningsBox.textContent = pluginMessage.message;
    }
  } catch (err) {
    console.warn("[UI] \u7121\u52B9\u306A\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u7121\u8996\u3057\u307E\u3057\u305F", err);
  }
});
var btnRun = $("#btn-run");
if (btnRun) {
  btnRun.addEventListener("click", () => {
    window.parent.postMessage({ pluginMessage: { type: "reinspect", inspector: "" } }, "*");
  });
}
function escapeHtml(s) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function renderList(rows) {
  if (!listBox) return;
  if (!rows || rows.length === 0) {
    listBox.innerHTML = '<div class="muted">\u691C\u51FA\u306A\u3057</div>';
    return;
  }
  const head = '<div style="display:grid;grid-template-columns:70px 80px 1fr 70px 60px;gap:6px;margin-bottom:6px;" class="muted"><div>type</div><div>severity</div><div>details</div><div>node</div><div>JIS</div></div>';
  const body = rows.map((r) => {
    const type = escapeHtml(r.issueType);
    const sev = escapeHtml(r.severity);
    const det = escapeHtml(r.details);
    const node = escapeHtml(r.nodeName);
    const jis = escapeHtml(r.JISClauseId);
    return `<div style="display:grid;grid-template-columns:70px 80px 1fr 70px 60px;gap:6px;margin:4px 0;"><div>${type}</div><div class="${sev === "error" ? "err" : "warn"}">${sev}</div><div title="${det}">${det}</div><div title="${node}">${node}</div><div title="${jis}">${jis}</div></div>`;
  }).join("");
  listBox.innerHTML = head + body;
}
function escapeCsv(value) {
  const mustQuote = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return mustQuote ? `"${escaped}"` : escaped;
}
function toCsv(rows) {
  const header = "timestamp,frameName,nodeId,nodeName,issueType,severity,details,suggestedFix,JISClauseId";
  const body = rows.map(
    (r) => [
      r.timestamp,
      r.frameName,
      r.nodeId,
      r.nodeName,
      r.issueType,
      r.severity,
      r.details,
      r.suggestedFix,
      r.JISClauseId
    ].map((v) => escapeCsv(v)).join(",")
  ).join("\n");
  return `${header}
${body}`;
}
var btnCsv = $("#btn-csv");
if (btnCsv) {
  btnCsv.addEventListener("click", () => {
    const payload = latestPayload;
    if (!payload) return;
    const csv = toCsv(payload.rows);
    const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace(/[:T]/g, "").replace("-", "");
    download(`jis_checker_${stamp}.csv`, csv, "text/csv");
  });
}
//# sourceMappingURL=ui.js.map
