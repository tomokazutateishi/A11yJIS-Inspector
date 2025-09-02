/**
 * Figma Plugin main（検査実行とUI連携）
 *
 * 要点：
 * - 選択フレーム配下ノードの走査
 * - 3つの最小チェック：contrast / altText / touchTarget
 * - CSV/Markdown行用データの生成
 * - UIへの集計送信（ダッシュボード）
 * - 監査ログはUI側でダウンロード
 */

import { analyzeSelection } from './utils/ruleEngine';
import type { IssueRow, Summary } from './utils/types';
import jisMapping from './rules/jis_mapping.json';

function showUI() {
  figma.showUI(__html__, { width: 380, height: 460, themeColors: true });
}

function warnUI(message: string) {
  figma.ui.postMessage({ type: 'warning', message });
}

async function runInspection(inspector?: string) {
  // 対象：選択フレーム配下のノード
  const selection = figma.currentPage.selection;
  const frames = selection.filter((n) => n.type === 'FRAME') as FrameNode[];

  if (frames.length === 0) {
    warnUI('フレームを1つ以上選択してください。');
    return;
  }

  try {
    const { rows, nodeCount, perType, errorCount, warnCount, frameName } = await analyzeSelection(
      frames,
      jisMapping
    );

    const summary: Summary = {
      nodeCount,
      errorCount,
      warnCount,
      perType,
      frameName,
      fileKey: figma.fileKey,
      pageName: figma.currentPage.name,
      ruleVersions: {
        JIS: 'JIS X 8341-3（ダミー版情報）',
        WCAG: 'WCAG 2.1 AA（ダミー）'
      }
    };

    const payload = {
      rows: rows as IssueRow[],
      summary,
      inspector: inspector || ''
    };

    figma.ui.postMessage({ type: 'summary', payload });
  } catch (err) {
    console.error(err);
    warnUI('検査中にエラーが発生しました。詳細はコンソールを確認してください。');
  }
}

figma.on('run', () => {
  showUI();
  // 初回自動実行
  runInspection();
});

figma.ui.onmessage = (msg: any) => {
  if (msg.type === 'reinspect') {
    runInspection(msg.inspector);
  }
};

