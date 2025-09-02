/**
 * 色計算の最小実装（WCAGコントラスト比）
 * - Solid塗りのRGBを0..1に正規化
 * - 相対輝度を算出
 * - コントラスト比 = (L1 + 0.05) / (L2 + 0.05)
 */

/** FigmaのRGB(0..1)をsRGBリニア化し相対輝度を求める */
export function relativeLuminance(rgb: { r: number; g: number; b: number }) {
  const srgb = [rgb.r, rgb.g, rgb.b].map((v) => {
    const c = clamp01(v);
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

export function contrastRatio(
  fg: { r: number; g: number; b: number },
  bg: { r: number; g: number; b: number }
) {
  const L1 = relativeLuminance(fg);
  const L2 = relativeLuminance(bg);
  const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (a + 0.05) / (b + 0.05);
}

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function solidPaintToRGB(paint: SolidPaint): { r: number; g: number; b: number } | null {
  if (paint.type !== 'SOLID' || paint.visible === false) return null;
  const { r, g, b } = paint.color;
  const opacity = paint.opacity ?? 1;
  // 背景合成は簡略化（不透明前提）
  return { r: r * opacity + (1 - opacity), g: g * opacity + (1 - opacity), b: b * opacity + (1 - opacity) };
}

/** 塗りから最初のSolid色を取得 */
export function firstSolidFromFills(
  node: GeometryMixin | TextNode
): { r: number; g: number; b: number } | null {
  const fills = (node as any).fills as readonly Paint[] | PluginAPI['mixed'];
  if (fills === figma.mixed || !fills || !Array.isArray(fills)) return null;
  for (const p of fills) {
    if (p.type === 'SOLID' && p.visible !== false) {
      return solidPaintToRGB(p as SolidPaint);
    }
  }
  return null;
}

/** 親の背景色（最初のSolid）を推定。なければ白 */
export function estimateBackgroundRGB(
  node: SceneNode
): { rgb: { r: number; g: number; b: number }; source: string } {
  let current: BaseNode | null = node.parent;
  while (current && current.type !== 'PAGE') {
    const geom = current as any as GeometryMixin;
    if (geom.fills && geom.fills !== figma.mixed && Array.isArray(geom.fills)) {
      for (const p of geom.fills as readonly Paint[]) {
        if (p.type === 'SOLID' && p.visible !== false) {
          const rgb = solidPaintToRGB(p as SolidPaint);
          if (rgb) return { rgb, source: `parent:${(current as SceneNode).name}` };
        }
      }
    }
    current = current.parent;
  }
  // fallback white（背景特定が困難な場合）
  return { rgb: { r: 1, g: 1, b: 1 }, source: 'default:white' };
}

