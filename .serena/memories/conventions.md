# コーディング規約・スタイル

- TypeScript: `strict: true`、`noEmit: true`（型安全を重視）。
- 型定義: プラグインコードは `@figma/plugin-typings` のみを使用（Node型は含めない）。ツール/設定ファイルは `tsconfig.tools.json` で Node 型を有効化。
- ESLint: `@typescript-eslint` + `plugin:import` + `simple-import-sort` + `@figma/figma-plugins` + Prettier。
  - ルール例: 未使用変数の検出、危険な any アクセスの警告、import 並び替え。
- import: ファイル冒頭にまとめ、`simple-import-sort` に従った順序にする。
- 例外ハンドリング: 例外でクラッシュさせず、UIへ警告、ログへ記録する。
- 文字列処理: ユーザー入力や可変文字列は `trim()` で正規化し、空白のみは未設定扱い。

# 設計方針
- ルールエンジンは小さく保ち、対象ノードの型ガードを明示する。
- Fallback 戦略: ネイティブ値優先（例: `node.description`）、なければ pluginData にフォールバック。
