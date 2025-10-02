# プロジェクト概要

- 名称: A11yJIS Inspector（JIS準拠チェッカー v0.1 PoC）
- 目的: Figma プラグインとして、選択フレーム配下ノードの最小アクセシビリティ検査を行い、集計とレポート（CSV/Markdown）を生成する。
- 機能: コントラスト検査、代替テキスト有無検査、タッチターゲット最小サイズ検査、UIでのダッシュボード表示、監査ログ出力。
- エントリポイント: `dist/code.js`（main）, `dist/ui.html` + `dist/ui.js`（UI）。
- マニフェスト: `manifest.json`（Figma Manifest v2）。

## 技術スタック
- TypeScript 5 / ESNext（ターゲット: ES2018/ES2021）
- Figma Plugin API + `@figma/plugin-typings`
- ビルド: esbuild
- Lint/Format: ESLint（@typescript-eslint, import, simple-import-sort, @figma/figma-plugins）+ Prettier

## ディレクトリ構成
- `src/code.ts`: プラグイン main スレッド
- `src/ui/`: UI ロジックとテンプレート
- `src/utils/`: ルールエンジンや共通ユーティリティ
- `src/rules/`: ルール用JSON（`jis_mapping.json`）
- `dist/`: ビルド成果物（`build`/`watch`で生成）

## TypeScript 設定
- `tsconfig.json`: プラグイン用（`types: ["@figma/plugin-typings"]`）。Node グローバルは含めない。
- `tsconfig.tools.json`: ツール/設定/スクリプト用（`types: ["node"]`）。ESLintやビルドスクリプトの型解決に使用。

## 補足
- UI 側の `process.env` 参照はビルド時置換を想定（ランタイムではNode型は露出しない）。
- 例外はクラッシュさせず警告としてUIに通知し、ログに残す方針。
