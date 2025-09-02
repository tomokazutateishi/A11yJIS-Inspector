/* eslint-disable no-undef */

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

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

const inspectorInput = $('#inspector') as HTMLInputElement;
const kpiCount = $('#kpi-count');
const kpiErrors = $('#kpi-errors');
const kpiWarns = $('#kpi-warns');
const cntContrast = $('#cnt-contrast');
const cntAlt = $('#cnt-alt');
const cntTouch = $('#cnt-touch');
const warningsBox = $('#warnings');

let latestPayload: ExportPayload | null = null;

function download(filename: string, content: string, mime = 'text/plain') {
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

function escapeCsv(value: string) {
  const mustQuote = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return mustQuote ? `"${escaped}"` : escaped;
}

function toCsv(rows: IssueRow[]) {
  // CSVヘッダ例：
  // timestamp,frameName,nodeId,nodeName,issueType,severity,details,suggestedFix,JISClauseId
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

function now() {
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

function toMarkdown(payload: ExportPayload) {
  const { rows, summary, inspector } = payload;
  const { human } = now();

  // Markdownテンプレ（要求事項）
  // 先頭に "A11yJIS Inspector Report"、"検査日時"、"検査者"、"対象ファイル"、"JIS/WCAG版"、"合否集計"
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
    '# A11yJIS Inspector Report',
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
    `- プラグイン: A11yJIS Inspector v0.1`
  ].join('\n');
}

function toAuditLog(payload: ExportPayload) {
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

function updateKpis(payload: ExportPayload) {
  latestPayload = payload;

  kpiCount.textContent = String(payload.summary.nodeCount);
  kpiErrors.textContent = String(payload.summary.errorCount);
  kpiWarns.textContent = String(payload.summary.warnCount);

  cntContrast.textContent = String(payload.summary.perType['contrast'] || 0);
  cntAlt.textContent = String(payload.summary.perType['altText'] || 0);
  cntTouch.textContent = String(payload.summary.perType['touchTarget'] || 0);
}

window.onmessage = (e) => {
  const msg = e.data.pluginMessage as
    | { type: 'summary'; payload: ExportPayload; warning?: string }
    | { type: 'warning'; message: string };

  if (msg.type === 'summary') {
    updateKpis(msg.payload);
    warningsBox.textContent = msg.warning || '';
  } else if (msg.type === 'warning') {
    warningsBox.textContent = msg.message;
  }
};

$('#btn-run').addEventListener('click', () => {
  parent.postMessage(
    { pluginMessage: { type: 'reinspect', inspector: inspectorInput.value.trim() } },
    '*'
  );
});

$('#btn-csv').addEventListener('click', () => {
  if (!latestPayload) return;
  const { stamp } = now();
  const csv = toCsv(latestPayload.rows);
  download(`exports/a11yjis_report_${stamp}.csv`, csv, 'text/csv');
});

$('#btn-md').addEventListener('click', () => {
  if (!latestPayload) return;
  const { stamp } = now();
  const md = toMarkdown({ ...latestPayload, inspector: inspectorInput.value.trim() });
  download(`exports/a11yjis_report_${stamp}.md`, md, 'text/markdown');
});

$('#btn-audit').addEventListener('click', () => {
  if (!latestPayload) return;
  const { filename, json } = toAuditLog({
    ...latestPayload,
    inspector: inspectorInput.value.trim()
  });
  download(filename, json, 'application/json');
});

// ダミー凡例リンク（将来差し替え）
$('#link-clause').addEventListener('click', (e) => {
  e.preventDefault();
  window.open('https://www.w3.org/TR/WCAG21/', '_blank', 'noreferrer');
});

