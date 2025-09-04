// 親ウィンドウ参照は window.parent を使用
// 許可オリジン（Figma Web/デスクトップ/同一オリジン）
const ALLOWED_ORIGINS = new Set<string>([
  'https://www.figma.com',
  'null'
]);

// 開発・テスト用: 環境変数やビルド時定数から追加
// @ts-ignore: process.envはビルド時に置換される想定
if (typeof process !== 'undefined' && process.env && process.env.ALLOWED_ORIGINS) {
  for (const origin of process.env.ALLOWED_ORIGINS.split(',')) {
    if (origin) ALLOWED_ORIGINS.add(origin.trim());
  }
}

// UI側スクリプト：ダッシュボード表示と出力処理

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

type ExportPayload = {
  rows: IssueRow[];
  summary: Summary;
  inspector: string;
};

// メインスレッドからのメッセージ型定義
interface SummaryMessage {
  type: 'summary';
  payload: ExportPayload;
  warning?: string;
}

interface WarningMessage {
  type: 'warning';
  message: string;
}

type PluginMessage = SummaryMessage | WarningMessage;

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

const inspectorInput = $<HTMLInputElement>('#inspector');
const kpiCount = $('#kpi-count');
const kpiErrors = $('#kpi-errors');
const kpiWarns = $('#kpi-warns');
const cntContrast = $('#cnt-contrast');
const cntAlt = $('#cnt-alt');
const cntTouch = $('#cnt-touch');
const warningsBox = $('#warnings');

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

function escapeCsv(value: string): string {
  const mustQuote = /[ ",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return mustQuote ? `"${escaped}"` : escaped;
}

function toCsv(rows: IssueRow[]): string {
  const header =
    'timestamp,frameName,nodeId,nodeName,issueType,severity,details,suggestedFix,JISClauseId';
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

function now(): { stamp: string; human: string } {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    stamp: `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(
      d.getMinutes()
    )}`,
    human: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`
  };
}

function toMarkdown(payload: ExportPayload): string {
  const { rows, summary, inspector } = payload;
  const { human } = now();

  const perTypeLines = Object.entries(summary.perType)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const tableHeader =
    '| timestamp | frameName | nodeId | nodeName | issueType | severity | details | suggestedFix | JISClauseId |\n' +
    '|---|---|---|---|---|---|---|---|---|';

  const tableBody = rows
    .map(
      (r) =>
        `| ${r.timestamp} | ${r.frameName} | ${r.nodeId} | ${r.nodeName} | ${r.issueType} | ${r.severity} | ${r.details.replaceAll(
          '|',
          '\\|'
        )} | ${r.suggestedFix.replaceAll('|', '\\|')} | ${r.JISClauseId} |`
    )
    .join('\n');

  return [
    '# JIS準拠チェッカーレポート',
    `- 検査日時: ${human}`,
    `- 検査者: ${inspector || 'n/a'}`,
    `- 対象ファイル: ${summary.fileKey || 'n/a'} / ページ: ${summary.pageName || '-'}`,
    `- JIS/WCAG版: JIS=${summary.ruleVersions.JIS}, WCAG=${summary.ruleVersions.WCAG}`,
    '',
    '## 概要',
    `- 対象フレーム: ${summary.frameName}`,
    `- 対象ノード数: ${summary.nodeCount}`,
    `- 検出件数: error=${summary.errorCount}, warning=${summary.warnCount}`,
    '',
    '## 件数サマリ（issueType別）',
    perTypeLines || '- なし',
    '',
    '## 違反表',
    tableHeader,
    tableBody || '| なし |  |  |  |  |  |  |  |  |',
    '',
    '## 検査環境',
    `- Figmaバージョン: n/a`,
    `- プラグイン: JIS準拠チェッカー v0.1`
  ].join('\n');
}

function toAuditLog(payload: ExportPayload): { filename: string; json: string } {
  const { stamp } = now();
  const { summary, inspector } = payload;
  const runId = `run_${stamp}_${Math.random().toString(36).slice(2, 8)}`;
  const log = {
    runId,
    inspector: inspector || 'n/a',
    fileKey: summary.fileKey || null,
    pageName: summary.pageName || null,
    frameName: summary.frameName,
    nodeCount: summary.nodeCount,
    ruleVersions: summary.ruleVersions
  };
  return { filename: `exports/audit_log_${stamp}.json`, json: JSON.stringify(log, null, 2) };
}

function updateKpis(payload: ExportPayload): void {
  latestPayload = payload;
  if (kpiCount) kpiCount.textContent = String(payload.summary.nodeCount);
  if (kpiErrors) kpiErrors.textContent = String(payload.summary.errorCount);
  if (kpiWarns) kpiWarns.textContent = String(payload.summary.warnCount);
  if (cntContrast) cntContrast.textContent = String(payload.summary.perType['contrast'] || 0);
  if (cntAlt) cntAlt.textContent = String(payload.summary.perType['altText'] || 0);
  if (cntTouch) cntTouch.textContent = String(payload.summary.perType['touchTarget'] || 0);
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
    if (inspectorInput) {
      const name = inspectorInput.value.trim();
      console.log('[UI] reinpect click', { inspector: name });
      // 親ウィンドウのオリジンを取得し、明示的に指定
      let parentOrigin: string | undefined;
      try {
        if (document.referrer) {
          parentOrigin = new URL(document.referrer).origin;
        }
      } catch (e) {
        parentOrigin = undefined;
      }
      // 許可リストで検証
      const allowedOrigins = ['https://www.figma.com'];
      if (parentOrigin && allowedOrigins.some(o => parentOrigin === o || parentOrigin.startsWith('chrome-extension://'))) {
        window.parent.postMessage({ pluginMessage: { type: 'reinspect', inspector: name } }, parentOrigin);
      } else {
        console.warn('[UI] postMessage送信先オリジンが許可されていません:', parentOrigin);
      }
    }
  });
}

const btnCsv = $('#btn-csv');
if (btnCsv) {
  btnCsv.addEventListener('click', () => {
    const payload = latestPayload;
    if (!payload) return;
    const { stamp } = now();
    const csv = toCsv(payload.rows);
    download(`exports/jis_checker_report_${stamp}.csv`, csv, 'text/csv');
  });
}

const btnMd = $('#btn-md');
if (btnMd) {
  btnMd.addEventListener('click', () => {
    const payload = latestPayload;
    if (!payload || !inspectorInput) return;
    const { stamp } = now();
    const md = toMarkdown({ ...payload, inspector: inspectorInput.value.trim() });
    download(`exports/jis_checker_report_${stamp}.md`, md, 'text/markdown');
  });
}

const btnAudit = $('#btn-audit');
if (btnAudit) {
  btnAudit.addEventListener('click', () => {
    const payload = latestPayload;
    if (!payload || !inspectorInput) return;
    const { filename, json } = toAuditLog({
      ...payload,
      inspector: inspectorInput.value.trim()
    });
    download(filename, json, 'application/json');
  });
}

const linkClause = $('#link-clause');
if (linkClause) {
  linkClause.addEventListener('click', (e) => {
    e.preventDefault();
    window.open('https://www.w3.org/TR/WCAG21/', '_blank', 'noreferrer');
  });
}