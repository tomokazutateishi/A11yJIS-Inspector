"use strict";
(() => {
  // ui.ts
  var $ = (sel) => document.querySelector(sel);
  var inspectorInput = $("#inspector");
  var kpiCount = $("#kpi-count");
  var kpiErrors = $("#kpi-errors");
  var kpiWarns = $("#kpi-warns");
  var cntContrast = $("#cnt-contrast");
  var cntAlt = $("#cnt-alt");
  var cntTouch = $("#cnt-touch");
  var warningsBox = $("#warnings");
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
  function now() {
    const d = /* @__PURE__ */ new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return {
      stamp: `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(
        d.getMinutes()
      )}`,
      human: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}`
    };
  }
  function toMarkdown(payload) {
    const { rows, summary, inspector } = payload;
    const { human } = now();
    const perTypeLines = Object.entries(summary.perType).map(([k, v]) => `- ${k}: ${v}`).join("\n");
    const tableHeader = "| timestamp | frameName | nodeId | nodeName | issueType | severity | details | suggestedFix | JISClauseId |\n|---|---|---|---|---|---|---|---|---|";
    const tableBody = rows.map(
      (r) => `| ${r.timestamp} | ${r.frameName} | ${r.nodeId} | ${r.nodeName} | ${r.issueType} | ${r.severity} | ${r.details.replaceAll(
        "|",
        "\\|"
      )} | ${r.suggestedFix.replaceAll("|", "\\|")} | ${r.JISClauseId} |`
    ).join("\n");
    return [
      "# JIS\u6E96\u62E0\u30C1\u30A7\u30C3\u30AB\u30FC\u30EC\u30DD\u30FC\u30C8",
      `- \u691C\u67FB\u65E5\u6642: ${human}`,
      `- \u691C\u67FB\u8005: ${inspector || "n/a"}`,
      `- \u5BFE\u8C61\u30D5\u30A1\u30A4\u30EB: ${summary.fileKey || "n/a"} / \u30DA\u30FC\u30B8: ${summary.pageName || "-"}`,
      `- JIS/WCAG\u7248: JIS=${summary.ruleVersions.JIS}, WCAG=${summary.ruleVersions.WCAG}`,
      "",
      "## \u6982\u8981",
      `- \u5BFE\u8C61\u30D5\u30EC\u30FC\u30E0: ${summary.frameName}`,
      `- \u5BFE\u8C61\u30CE\u30FC\u30C9\u6570: ${summary.nodeCount}`,
      `- \u691C\u51FA\u4EF6\u6570: error=${summary.errorCount}, warning=${summary.warnCount}`,
      "",
      "## \u4EF6\u6570\u30B5\u30DE\u30EA\uFF08issueType\u5225\uFF09",
      perTypeLines || "- \u306A\u3057",
      "",
      "## \u9055\u53CD\u8868",
      tableHeader,
      tableBody || "| \u306A\u3057 |  |  |  |  |  |  |  |  |",
      "",
      "## \u691C\u67FB\u74B0\u5883",
      `- Figma\u30D0\u30FC\u30B8\u30E7\u30F3: n/a`,
      `- \u30D7\u30E9\u30B0\u30A4\u30F3: JIS\u6E96\u62E0\u30C1\u30A7\u30C3\u30AB\u30FC v0.1`
    ].join("\n");
  }
  function toAuditLog(payload) {
    const { stamp } = now();
    const { summary, inspector } = payload;
    const runId = `run_${stamp}_${Math.random().toString(36).slice(2, 8)}`;
    const log = {
      runId,
      inspector: inspector || "n/a",
      fileKey: summary.fileKey || null,
      pageName: summary.pageName || null,
      frameName: summary.frameName,
      nodeCount: summary.nodeCount,
      ruleVersions: summary.ruleVersions
    };
    return { filename: `exports/audit_log_${stamp}.json`, json: JSON.stringify(log, null, 2) };
  }
  function updateKpis(payload) {
    latestPayload = payload;
    kpiCount.textContent = String(payload.summary.nodeCount);
    kpiErrors.textContent = String(payload.summary.errorCount);
    kpiWarns.textContent = String(payload.summary.warnCount);
    cntContrast.textContent = String(payload.summary.perType["contrast"] || 0);
    cntAlt.textContent = String(payload.summary.perType["altText"] || 0);
    cntTouch.textContent = String(payload.summary.perType["touchTarget"] || 0);
  }
  window.onmessage = (e) => {
    const msg = e.data.pluginMessage;
    if (msg.type === "summary") {
      updateKpis(msg.payload);
      warningsBox.textContent = msg.warning || "";
    } else if (msg.type === "warning") {
      warningsBox.textContent = msg.message;
    }
  };
  $("#btn-run").addEventListener("click", () => {
    parent.postMessage(
      { pluginMessage: { type: "reinspect", inspector: inspectorInput.value.trim() } },
      "*"
    );
  });
  $("#btn-csv").addEventListener("click", () => {
    if (!latestPayload) return;
    const { stamp } = now();
    const csv = toCsv(latestPayload.rows);
    download(`exports/jis_checker_report_${stamp}.csv`, csv, "text/csv");
  });
  $("#btn-md").addEventListener("click", () => {
    if (!latestPayload) return;
    const { stamp } = now();
    const md = toMarkdown({ ...latestPayload, inspector: inspectorInput.value.trim() });
    download(`exports/jis_checker_report_${stamp}.md`, md, "text/markdown");
  });
  $("#btn-audit").addEventListener("click", () => {
    if (!latestPayload) return;
    const { filename, json } = toAuditLog({
      ...latestPayload,
      inspector: inspectorInput.value.trim()
    });
    download(filename, json, "application/json");
  });
  $("#link-clause").addEventListener("click", (e) => {
    e.preventDefault();
    window.open("https://www.w3.org/TR/WCAG21/", "_blank", "noreferrer");
  });
})();
