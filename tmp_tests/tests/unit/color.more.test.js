import { firstSolidFromFills } from '../../src/utils/color.js';
function assert(cond, msg) {
    if (!cond)
        throw new Error(msg);
}
function assertClose(actual, expected, eps = 1e-6, msg) {
    if (Math.abs(actual - expected) > eps) {
        throw new Error(msg ?? `Expected ${expected}, got ${actual}`);
    }
}
// figma.mixed の最低限のモック
globalThis.figma = { mixed: Symbol('mixed') };
// visible: false は無視され null
{
    const node = { fills: [{ type: 'SOLID', visible: false, color: { r: 1, g: 0, b: 0 } }] };
    const rgb = firstSolidFromFills(node);
    assert(rgb === null, 'invisible solid should be ignored');
}
// opacity: 0 は白に合成（簡略化の仕様に従う）
{
    const node = { fills: [{ type: 'SOLID', visible: true, color: { r: 0, g: 0, b: 1 }, opacity: 0 }] };
    const rgb = firstSolidFromFills(node);
    assertClose(rgb.r, 1, 1e-6);
    assertClose(rgb.g, 1, 1e-6);
    assertClose(rgb.b, 1, 1e-6);
}
// 最初の要素が非SOLIDでも、最初のSOLIDを選ぶ
{
    const node = {
        fills: [
            { type: 'GRADIENT_LINEAR' },
            { type: 'SOLID', visible: true, color: { r: 0.2, g: 0.4, b: 0.6 }, opacity: 1 }
        ]
    };
    const rgb = firstSolidFromFills(node);
    assertClose(rgb.r, 0.2, 1e-6);
    assertClose(rgb.g, 0.4, 1e-6);
    assertClose(rgb.b, 0.6, 1e-6);
}
console.log('[OK] color.more.test.ts');
