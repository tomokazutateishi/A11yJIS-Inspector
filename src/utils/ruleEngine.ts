/**
 * 最小ルールエンジン
 * - contrast / altText / touchTarget の3ルールを実装
 * - JISマッピングは /rules/jis_mapping.json を参照
 *
 * 例外はクラッシュさせず、warningとして報告します。
 */

import { Rule, RuleResult, RuleType } from './types';
import { isColorSimilar } from './color';

function isTextNode(n: SceneNode): n is TextNode {
  return n.type === 'TEXT';
}

function isComponentOrSet(n: SceneNode): n is ComponentNode | ComponentSetNode {
  return n.type === 'COMPONENT' || n.type === 'COMPONENT_SET';
}

export function getNodeDescriptionSafe(node: SceneNode): string | undefined {
  if (isComponentOrSet(node)) {
    return node.description ?? undefined;
  }
  const pd = node.getPluginData?.('description');
  return pd || undefined;
}
import type { AnalyzeResult, IssueRow, JISMapping } from './types';

function ts(): string {
  return new Date().toISOString();
}

// 型ガード
function hasFills(node: SceneNode): node is SceneNode & GeometryMixin {
  return 'fills' in node;
}

function isLayoutable(node: SceneNode): node is SceneNode & LayoutMixin {
  return 'width' in node && 'height' in node;
}

function isImageLike(node: SceneNode): boolean {
  if (hasFills(node)) {
    const fills = node.fills;
    if (fills && fills !== figma.mixed && Array.isArray(fills)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return fills.some((p) => p.type === 'IMAGE');
    }
  }
  return false;
}

function collectNodesWithin(frames: FrameNode[]): SceneNode[] {
  const nodes: SceneNode[] = [];
  const allowedTypes = new Set<SceneNode['type']>([
    'TEXT',
    'FRAME',
    'GROUP',
    'VECTOR',
    'RECTANGLE',
    'ELLIPSE',
    'POLYGON',
    'STAR',
    'INSTANCE',
    'COMPONENT',
    'COMPONENT_SET'
  ]);
  for (const f of frames) {
    const found = f.findAll((n) => allowedTypes.has(n.type));
    nodes.push(...found);
  }
  return nodes;
}

function aaThreshold(): number {
  // 簡易：AA基準 4.5:1（太字・大サイズ考慮なしの最小）
  return 4.5;
}

function checkContrast(node: SceneNode, frameName: string, map: JISMapping): IssueRow | null {
  if (!hasFills(node) && !isTextNode(node)) return null;

  const fg = firstSolidFromFills(node);
  const bgEst = estimateBackgroundRGB(node);

  if (!fg) {
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

  const desc = getNodeDescriptionSafe(node) ?? '';

  if (desc.length > 0) {
    return null; // OK
  }

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

function checkTouchTarget(node: SceneNode, frameName: string, map: JISMapping): IssueRow | null {
  if (!isLayoutable(node)) return null;

  const w = node.width;
  const h = node.height;

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

export function analyzeSelection(
  frames: FrameNode[],
  jisMap: JISMapping
): AnalyzeResult {
  const nodes = collectNodesWithin(frames);
  const rows: IssueRow[] = [];
  let errorCount = 0;
  let warnCount = 0;
  const perType: Record<string, number> = { contrast: 0, altText: 0, touchTarget: 0 };

  const frameName = frames.length === 1 ? frames[0].name : `${frames.length} frames`;

  const rules = [
    { fn: checkContrast, type: 'contrast' as const, jisKey: 'contrast' as const },
    { fn: checkAltText, type: 'altText' as const, jisKey: 'altText' as const },
    { fn: checkTouchTarget, type: 'touchTarget' as const, jisKey: 'touchTarget' as const }
  ];

  for (const n of nodes) {
    for (const { fn, type, jisKey } of rules) {
      try {
        const issue = fn(n, frameName, jisMap);
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
          issueType: type,
          severity: 'warning',
          details: `ルール評価中に例外: ${(e as Error).message}`,
          suggestedFix: '対象ノードの塗り/サイズ/descriptionを確認してください。',
          JISClauseId: jisMap[jisKey] || jisMap.contrast
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
