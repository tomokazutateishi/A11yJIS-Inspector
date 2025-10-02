import { clamp01, contrastRatio, relativeLuminance } from '../../src/utils/color.js';
function assertClose(actual, expected, eps = 1e-6, msg) {
    if (Math.abs(actual - expected) > eps) {
        throw new Error(msg ?? `Expected ${expected}, got ${actual}`);
    }
}
function assertEqual(actual, expected, msg) {
    if (actual !== expected)
        throw new Error(msg ?? `Expected ${expected}, got ${actual}`);
}
// clamp01
assertEqual(clamp01(-0.5), 0, 'clamp01 below range');
assertEqual(clamp01(0), 0, 'clamp01 lower bound');
assertEqual(clamp01(0.5), 0.5, 'clamp01 mid');
assertEqual(clamp01(2), 1, 'clamp01 above range');
// relativeLuminance: 白と黒の既知値
assertClose(relativeLuminance({ r: 1, g: 1, b: 1 }), 1, 1e-12, 'luminance white');
assertClose(relativeLuminance({ r: 0, g: 0, b: 0 }), 0, 1e-12, 'luminance black');
// contrastRatio: 白と黒は21:1
assertClose(contrastRatio({ r: 1, g: 1, b: 1 }, { r: 0, g: 0, b: 0 }), 21, 1e-12, 'contrast white/black');
console.log('[OK] color.test.ts');
