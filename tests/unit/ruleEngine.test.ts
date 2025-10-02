import { getNodeDescriptionSafe } from '../../src/utils/ruleEngine.js';

function assertEqual<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) throw new Error(msg ?? `Expected ${expected}, got ${actual}`);
}

// モック: SceneNode風の最小オブジェクト
type AnyNode = any;

// 1) ネイティブ description を優先し、trim して空なら未設定扱い
{
  const node: AnyNode = { type: 'RECTANGLE', description: '  native  ' };
  const res = getNodeDescriptionSafe(node as unknown as SceneNode);
  assertEqual(res, 'native', 'native description should be trimmed and used');
}

{
  const node: AnyNode = {
    type: 'RECTANGLE',
    description: '   ',
    getPluginData: (k: string) => (k === 'description' ? ' from plugin ' : undefined)
  };
  const res = getNodeDescriptionSafe(node as unknown as SceneNode);
  assertEqual(res, 'from plugin', 'fallback to trimmed plugin data when native empty');
}

// 2) ネイティブなし → pluginData のみ使用（trim）
{
  const node: AnyNode = {
    type: 'RECTANGLE',
    getPluginData: (k: string) => (k === 'description' ? '  plugin  ' : undefined)
  };
  const res = getNodeDescriptionSafe(node as unknown as SceneNode);
  assertEqual(res, 'plugin', 'use plugin data when no native');
}

// 3) 両方未設定/空白 → undefined
{
  const node: AnyNode = {
    type: 'RECTANGLE',
    description: '   ',
    getPluginData: (k: string) => (k === 'description' ? '   ' : undefined)
  };
  const res = getNodeDescriptionSafe(node as unknown as SceneNode);
  assertEqual(res, undefined, 'return undefined when both empty');
}

// 4) getPluginData が存在しない場合でも落ちない
{
  const node: AnyNode = { type: 'RECTANGLE' };
  const res = getNodeDescriptionSafe(node as unknown as SceneNode);
  assertEqual(res, undefined, 'no native and no plugin data → undefined');
}

console.log('[OK] ruleEngine.test.ts');
