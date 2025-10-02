import { firstSolidFromFills, estimateBackgroundRGB } from '../../src/utils/color.js';

function assertEqual<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) throw new Error(msg ?? `Expected ${expected}, got ${actual}`);
}

function assertClose(actual: number, expected: number, eps = 1e-6, msg?: string) {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(msg ?? `Expected ${expected}, got ${actual}`);
  }
}

// figma.mixed の最低限のモック
(globalThis as any).figma = { mixed: Symbol('mixed') } as any;

// 1) firstSolidFromFills: 最初のSOLIDを拾い、opacityを合成
{
  const node: any = {
    fills: [
      { type: 'SOLID', visible: true, color: { r: 1, g: 0, b: 0 }, opacity: 0.5 },
      { type: 'SOLID', visible: true, color: { r: 0, g: 0, b: 1 } }
    ]
  };
  const rgb = firstSolidFromFills(node as any);
  if (!rgb) throw new Error('rgb should be present');
  // opacity=0.5 なので、(r=1,g=0,b=0) が 50% 白にブレンド => 0.5*1 + 0.5 = 1.0（赤成分は1.0）、他は0.5
  assertClose(rgb.r, 1.0, 1e-6, 'r with opacity');
  assertClose(rgb.g, 0.5, 1e-6, 'g with opacity');
  assertClose(rgb.b, 0.5, 1e-6, 'b with opacity');
}

// 2) estimateBackgroundRGB: 直近の親の最初のSOLIDを返す
{
  const parentWithFill: any = {
    type: 'FRAME',
    name: 'Container',
    fills: [
      { type: 'SOLID', visible: true, color: { r: 0, g: 1, b: 0 }, opacity: 1 }
    ],
    parent: { type: 'PAGE' }
  };
  const node: any = { type: 'RECTANGLE', parent: parentWithFill };
  const est = estimateBackgroundRGB(node as any);
  assertEqual(est.source, 'parent:Container', 'source label includes parent name');
  assertClose(est.rgb.r, 0, 1e-6);
  assertClose(est.rgb.g, 1, 1e-6);
  assertClose(est.rgb.b, 0, 1e-6);
}

console.log('[OK] color.paints.test.ts');

