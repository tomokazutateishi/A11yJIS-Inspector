/**
 * 最小ルールエンジン
 * - contrast / altText / touchTarget の3ルールを実装
 * - JISマッピングは /rules/jis_mapping.json を参照
 *
 * 例外はクラッシュさせず、warningとして報告します。
 */

import { contrastRatio, estimateBackgroundRGB, firstSolidFromFills } from './color';
import type { AnalyzeResult, IssueRow, JISMapping } from './types';

function ts() {
  return new Date().toISOString();
}

function isImageLike(node: SceneNode) {
  // Image: ImagePaintを持つ塗りを含むとみなす
  const geom = node as any as GeometryMixin;
  if (geom.fills && geom.fills !== figma.mixed && Array.isArray(geom.fills)) {
    return (geom.fills as readonly Paint[]).some((p) => p.type === 'IMAGE');
  }
  return node.type === 'RECTANGLE' || node.type === 'ELLIPSE' || node.type === 'POLYGON' || node.type === 'STAR';
}

function collectNodesWithin(frames: FrameNode[]) {
  const nodes: SceneNode[] = [];
  for (const f of frames) {
    f.findAll((n) => {
      if (
        n.type === 'TEXT' ||
        n.type === 'FRAME' ||
        n.type === 'GROUP' ||
        n.type === 'VECTOR' ||
        n.type === 'RECTANGLE' ||
        n.type === 'ELLIPSE' ||
        n.type === 'POLYGON' ||
        n.type === 'STAR' ||
        n.type === 'INSTANCE' ||
        n.type === 'COMPONENT' ||
        n.type === 'COMPONENT_SET'
      ) {
        nodes.push(n);
      }
      return false;
    });
  }
  return nodes;
}

function aaThreshold(/* node: SceneNode, isText: boolean */) {
  // 簡易：AA基準 4.5:1（太字・大サイズ考慮なしの最小）
  return 4.5;
}

function checkContrast(node: SceneNode, frameName: string, map: JISMapping): IssueRow | null {
  // テキスト/グラフィック共に最小実装として4.5:1閾値を適用
  const fg = firstSolidFromFills(node as any);
  const bgEst = estimateBackgroundRGB(node);

  if (!fg) {
    // 前景色が取得できない場合は要確認（warning）
    return {
      timestamp: ts(),
      frameName,
      nodeId: node.id,
      nodeName: node.name,
      issueType: 'contrast',
      severity: 'warning',
      details: '前景色（Solid）が取得できません。グラデーション/画像/ミックスの可能性。',
      suggestedFix: '単一のSolid塗りか、背景とのコントラストが十分かを確認してください。',
      JISClauseId: map.contrast
    };
  }

  const ratio = contrastRatio(fg, bgEst.rgb);
  const threshold = aaThreshold();

  if (ratio < threshold) {
    return {
      timestamp: ts(),
      frameName,
      nodeId: node.id,
      nodeName: node.name,
      issueType: 'contrast',
      severity: 'error',
      details: `コントラスト比=${ratio.toFixed(2)}（閾値=${threshold}）。背景推定=${bgEst.source}`,
      suggestedFix: '前景/背景の色を調整してコントラスト比を上げてください（AA>=4.5）。',
      JISClauseId: map.contrast
    };
  }
  return null;
}

function checkAltText(node: SceneNode, frameName: string, map: JISMapping): IssueRow | null {
  if (!(node.type === 'VECTOR' || isImageLike(node))) return null;

  const desc = (node as BaseNode).description || '';
  if (desc.trim().length === 0) {
    return {
      timestamp: ts(),
      frameName,
      nodeId: node.id,
      nodeName: node.name,
      issueType: 'altText',
      severity: 'error',
      details: '代替テキスト（description）が未設定です。',
      suggestedFix: 'ノードのdescriptionに内容を要約した代替テキストを設定してください。',
      JISClauseId: map.altText
    };
  }
  return null;
}

function checkTouchTarget(node: SceneNode, frameName: string, map: JISMapping): IssueRow | null {
  const w = (node as LayoutMixin).width;
  const h = (node as LayoutMixin).height;
  if (typeof w !== 'number' || typeof h !== 'number') return null;

  if (w < 44 || h < 44) {
    return {
      timestamp: ts(),
      frameName,
      nodeId: node.id,
      nodeName: node.name,
      issueType: 'touchTarget',
      severity: 'error',
      details: `サイズ不足：${Math.round(w)}x${Math.round(h)}px。最小44x44pxを推奨。`,
      suggestedFix: 'ボタン/リンク等は44x44px以上のタッチターゲットを確保してください。',
      JISClauseId: map.touchTarget
    };
  }
  return null;
}

export async function analyzeSelection(
  frames: FrameNode[],
  jisMap: JISMapping
): Promise<AnalyzeResult> {
  const nodes = collectNodesWithin(frames);
  const rows: IssueRow[] = [];
  let errorCount = 0;
  let warnCount = 0;
  const perType: Record<string, number> = { contrast: 0, altText: 0, touchTarget: 0 };

  const frameName = frames.length === 1 ? frames[0].name : `${frames.length} frames`;

  for (const n of nodes) {
    for (const rule of [checkContrast, checkAltText, checkTouchTarget]) {
      try {
        const issue = rule(n, frameName, jisMap);
        if (issue) {
          rows.push(issue);
          perType[issue.issueType] = (perType[issue.issueType] || 0) + 1;
          if (issue.severity === 'error') errorCount++;
          if (issue.severity === 'warning') warnCount++;
        }
      } catch (e) {
        rows.push({
          timestamp: ts(),
          frameName,
          nodeId: n.id,
          nodeName: n.name,
          issueType: 'contrast',
          severity: 'warning',
          details: `ルール評価中に例外: ${(e as Error).message}`,
          suggestedFix: '対象ノードの塗り/サイズ/descriptionを確認してください。',
          JISClauseId: jisMap.contrast
        });
        warnCount++;
      }
    }
  }

  return {
    rows,
    nodeCount: nodes.length,
    errorCount,
    warnCount,
    perType,
    frameName
  };
}

