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
// モックノード
const nodes = [
    // コントラスト不足（赤 on 白）
    {
        id: 'n1',
        name: 'LowContrastRect',
        type: 'RECTANGLE',
        fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 0, b: 0 }, opacity: 1 }],
        parent: { type: 'FRAME', name: 'Frame1', parent: { type: 'PAGE' } }
    },
    // 代替テキストなし（VECTOR）
    {
        id: 'n2',
        name: 'VectorNoAlt',
        type: 'VECTOR'
    },
    // タッチターゲット不足
    {
        id: 'n3',
        name: 'TinyButton',
        type: 'RECTANGLE',
        width: 10,
        height: 12
    },
    // 代替テキストあり（trim 対象）
    {
        id: 'n4',
        name: 'VectorWithAlt',
        type: 'VECTOR',
        description: '  hello  '
    }
];
// Frame モック: findAll で対象ノードを返す
const frame = {
    type: 'FRAME',
    name: 'Frame1',
    findAll: (predicate) => nodes.filter((n) => predicate(n))
};
{
    const res = analyzeSelection([frame], jisMap);
    assertEqual(res.frameName, 'Frame1', 'single frame name');
    assertEqual(res.nodeCount, nodes.length, 'node count');
    assertEqual(res.errorCount, 3, 'error count');
    assertEqual(res.warnCount, 0, 'warn count');
    assertEqual(res.perType.contrast, 1, 'contrast violations');
    assertEqual(res.perType.altText, 1, 'alt violations');
    assertEqual(res.perType.touchTarget, 1, 'touchTarget violations');
}
console.log('[OK] analyzeSelection.test.ts');
