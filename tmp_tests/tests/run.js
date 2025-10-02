// 拡張子を明示（ESM解決のため）
import './unit/color.test.js';
import './unit/ruleEngine.test.js';
import './unit/color.paints.test.js';
import './unit/analyzeSelection.test.js';
import './unit/color.more.test.js';
import './unit/analyzeSelection.multiframe.test.js';
// 簡易テストランナー: 個々のテストは例外を投げると失敗扱い
// 各テストファイルは失敗時に例外を投げる設計
console.log('\nAll tests executed.');
