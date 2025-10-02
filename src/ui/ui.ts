// UI側スクリプト（MVP版）：
// - 検査実行ボタン
// - KPI（件数）表示のみ
// - CSV/Markdown等の出力は削除

// 許可オリジン（Figma Web/デスクトップ/ローカル）
const ALLOWED_ORIGINS = new Set<string>(['https://www.figma.com', 'null']);

type IssueRow = {
  timestamp: string;
  frameName: string;
  nodeId: string;
  nodeName: string;
  issueType: 'contrast' | 'altText' | 'touchTarget';
  severity: 'error' | 'warning' | 'info';
  details: string;
  suggestedFix: string;
  JISClauseId: string;
};

type Summary = {
  nodeCount: number;
  errorCount: number;
  warnCount: number;
  perType: Record<string, number>;
  frameName: string;
  fileKey?: string | null;
  pageName?: string;
  ruleVersions: { JIS: string; WCAG: string };
};

type ExportPayload = { rows: IssueRow[]; summary: Summary; inspector: string };

// メインスレッドからのメッセージ型定義
type PluginMessage =
  | { type: 'summary'; payload: ExportPayload; warning?: string }
  | { type: 'warning'; message: string };

// 型ガード関数
const isPluginMessage = (msg: unknown): msg is PluginMessage => {
  if (!msg || typeof msg !== 'object') return false;
  if (!('type' in msg) || typeof (msg as { type: unknown }).type !== 'string') {
    return false;
  }
  const type = (msg as PluginMessage).type;
  return type === 'summary' || type === 'warning';
};

const $ = <T extends HTMLElement>(sel: string): T | null => document.querySelector(sel);

const kpiCount = $('#kpi-count');
const kpiErrors = $('#kpi-errors');
const kpiWarns = $('#kpi-warns');
const cntContrast = $('#cnt-contrast');
const cntAlt = $('#cnt-alt');
const cntTouch = $('#cnt-touch');
const warningsBox = $('#warnings');
const listBox = $('#list');

let latestPayload: ExportPayload | null = null;

function download(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


function updateKpis(payload: ExportPayload): void {
  latestPayload = payload;
  if (kpiCount) kpiCount.textContent = String(payload.summary.nodeCount);
  if (kpiErrors) kpiErrors.textContent = String(payload.summary.errorCount);
  if (kpiWarns) kpiWarns.textContent = String(payload.summary.warnCount);
  if (cntContrast) cntContrast.textContent = String(payload.summary.perType['contrast'] || 0);
  if (cntAlt) cntAlt.textContent = String(payload.summary.perType['altText'] || 0);
  if (cntTouch) cntTouch.textContent = String(payload.summary.perType['touchTarget'] || 0);
  renderList(payload.rows);
}

// 受信メッセージの安全性を確保（オリジン/ペイロード検証）
window.addEventListener('message', (e: MessageEvent) => {
  try {
    if (e.source && e.source !== window.parent) return;
    if (e.origin && !ALLOWED_ORIGINS.has(e.origin)) return;

    const data = e.data as { pluginMessage?: unknown };
    if (!data || !data.pluginMessage) return;

    const pluginMessage = data.pluginMessage;

    if (!isPluginMessage(pluginMessage)) {
      if (typeof console !== 'undefined' && typeof console.debug === 'function') {
        const type = (pluginMessage as { type?: unknown })?.type;
        console.debug('[UI] Unknown message type:', type);
      }
      return;
    }

    if (pluginMessage.type === 'summary') {
      if (!pluginMessage.payload || typeof pluginMessage.payload !== 'object') return;
      updateKpis(pluginMessage.payload);
      if (warningsBox) warningsBox.textContent = pluginMessage.warning || '';
    } else if (pluginMessage.type === 'warning') {
      if (typeof pluginMessage.message !== 'string') return;
      if (warningsBox) warningsBox.textContent = pluginMessage.message;
    }
  } catch (err) {
    console.warn('[UI] 無効なメッセージを無視しました', err);
  }
});

const btnRun = $('#btn-run');
if (btnRun) {
  btnRun.addEventListener('click', () => {
    window.parent.postMessage({ pluginMessage: { type: 'reinspect', inspector: '' } }, '*');
  });
}

// --- 明細レンダリング（最小） ---
function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderList(rows: IssueRow[]): void {
  if (!listBox) return;
  if (!rows || rows.length === 0) {
    listBox.innerHTML = '<div class="muted">検出なし</div>';
    return;
  }
  const head =
    '<div style="display:grid;grid-template-columns:70px 80px 1fr 70px 60px;gap:6px;margin-bottom:6px;" class="muted">' +
    '<div>type</div><div>severity</div><div>details</div><div>node</div><div>JIS</div></div>';
  const body = rows
    .map((r) => {
      const type = escapeHtml(r.issueType);
      const sev = escapeHtml(r.severity);
      const det = escapeHtml(r.details);
      const node = escapeHtml(r.nodeName);
      const jis = escapeHtml(r.JISClauseId);
      return (
        '<div style="display:grid;grid-template-columns:70px 80px 1fr 70px 60px;gap:6px;margin:4px 0;">' +
        `<div>${type}</div><div class="${sev === 'error' ? 'err' : 'warn'}">${sev}</div>` +
        `<div title="${det}">${det}</div><div title="${node}">${node}</div><div title="${jis}">${jis}</div>` +
        '</div>'
      );
    })
    .join('');
  listBox.innerHTML = head + body;
}

// --- CSV 出力（最小） ---
function escapeCsv(value: string): string {
  const mustQuote = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return mustQuote ? `"${escaped}"` : escaped;
}

function toCsv(rows: IssueRow[]): string {
  const header = 'timestamp,frameName,nodeId,nodeName,issueType,severity,details,suggestedFix,JISClauseId';
  const body = rows
    .map((r) =>
      [
        r.timestamp,
        r.frameName,
        r.nodeId,
        r.nodeName,
        r.issueType,
        r.severity,
        r.details,
        r.suggestedFix,
        r.JISClauseId
      ]
        .map((v) => escapeCsv(v))
        .join(',')
    )
    .join('\n');
  return `${header}\n${body}`;
}

const btnCsv = $('#btn-csv');
if (btnCsv) {
  btnCsv.addEventListener('click', () => {
    const payload = latestPayload;
    if (!payload) return;
    const csv = toCsv(payload.rows);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '').replace('-', '');
    download(`jis_checker_${stamp}.csv`, csv, 'text/csv');
  });
}
