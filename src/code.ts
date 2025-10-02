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

import jisMapping from './rules/jis_mapping.json';
import { analyzeSelection } from './utils/ruleEngine';
import type { Summary } from './utils/types';

// UIからのメッセージの型定義
type UiMessage = { type: 'reinspect'; inspector: string };

function assertNever(x: never): never {
  throw new Error(`Unhandled message type: ${String(x)}`);
}

function showUI() {
  figma.showUI(__html__, { width: 360, height: 320, themeColors: true });
}

function warnUI(message: string) {
  figma.ui.postMessage({ type: 'warning', message });
}

function runInspection(inspector?: string) {
  // 対象：選択フレーム配下のノード
  const selection = figma.currentPage.selection;
  const frames = selection.filter((n) => n.type === 'FRAME');

  if (frames.length === 0) {
    warnUI('フレームを1つ以上選択してください。');
    return;
  }

  try {
    const { rows, nodeCount, perType, errorCount, warnCount, frameName } = analyzeSelection(
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
      rows: rows,
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
  void runInspection();
});

figma.ui.onmessage = (msg: UiMessage) => {
  console.log('[PLUGIN] onmessage', msg?.type);
  switch (msg.type) {
    case 'reinspect':
      void runInspection(msg.inspector);
      return;
    default:
      assertNever(msg as never);
  }
};
