import { analyzeSelection } from '../../src/utils/ruleEngine.js';
function assertEqual(actual, expected, msg) {
    if (actual !== expected)
        throw new Error(msg ?? `Expected ${expected}, got ${actual}`);
}
// figma.mixed の最低限のモック
globalThis.figma = { mixed: Symbol('mixed') };
const jisMap = {
    contrast: 'JIS-contrast',
    altText: 'JIS-altText',
    touchTarget: 'JIS-touchTarget'
};
// Frame1: コントラスト1件
const frame1Nodes = [
    {
        id: 'f1-n1',
        name: 'LowContrast',
        type: 'RECTANGLE',
        fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 0, b: 0 }, opacity: 1 }],
        parent: { type: 'FRAME', name: 'F1', parent: { type: 'PAGE' } }
    }
];
const frame1 = {
    type: 'FRAME',
    name: 'F1',
    findAll: (predicate) => frame1Nodes.filter((n) => predicate(n))
};
// Frame2: altText 1件 + touchTarget 1件
const frame2Nodes = [
    { id: 'f2-n1', name: 'VectorNoAlt', type: 'VECTOR' },
    { id: 'f2-n2', name: 'Tiny', type: 'RECTANGLE', width: 10, height: 10 }
];
const frame2 = {
    type: 'FRAME',
    name: 'F2',
    findAll: (predicate) => frame2Nodes.filter((n) => predicate(n))
};
{
    const res = analyzeSelection([frame1, frame2], jisMap);
    assertEqual(res.frameName, '2 frames', 'multi frame label');
    assertEqual(res.nodeCount, frame1Nodes.length + frame2Nodes.length, 'node count sum');
    assertEqual(res.errorCount, 3, 'total errors');
    assertEqual(res.perType.contrast, 1, 'contrast sum');
    assertEqual(res.perType.altText, 1, 'altText sum');
    assertEqual(res.perType.touchTarget, 1, 'touchTarget sum');
}
console.log('[OK] analyzeSelection.multiframe.test.ts');
