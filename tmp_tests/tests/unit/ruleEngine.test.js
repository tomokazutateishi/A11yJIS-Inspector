import { getNodeDescriptionSafe } from '../../src/utils/ruleEngine.js';
function assertEqual(actual, expected, msg) {
    if (actual !== expected)
        throw new Error(msg ?? `Expected ${expected}, got ${actual}`);
}
// 1) ネイティブ description を優先し、trim して空なら未設定扱い
{
    const node = { type: 'RECTANGLE', description: '  native  ' };
    const res = getNodeDescriptionSafe(node);
    assertEqual(res, 'native', 'native description should be trimmed and used');
}
{
    const node = {
        type: 'RECTANGLE',
        description: '   ',
        getPluginData: (k) => (k === 'description' ? ' from plugin ' : undefined)
    };
    const res = getNodeDescriptionSafe(node);
    assertEqual(res, 'from plugin', 'fallback to trimmed plugin data when native empty');
}
// 2) ネイティブなし → pluginData のみ使用（trim）
{
    const node = {
        type: 'RECTANGLE',
        getPluginData: (k) => (k === 'description' ? '  plugin  ' : undefined)
    };
    const res = getNodeDescriptionSafe(node);
    assertEqual(res, 'plugin', 'use plugin data when no native');
}
// 3) 両方未設定/空白 → undefined
{
    const node = {
        type: 'RECTANGLE',
        description: '   ',
        getPluginData: (k) => (k === 'description' ? '   ' : undefined)
    };
    const res = getNodeDescriptionSafe(node);
    assertEqual(res, undefined, 'return undefined when both empty');
}
// 4) getPluginData が存在しない場合でも落ちない
{
    const node = { type: 'RECTANGLE' };
    const res = getNodeDescriptionSafe(node);
    assertEqual(res, undefined, 'no native and no plugin data → undefined');
}
console.log('[OK] ruleEngine.test.ts');
