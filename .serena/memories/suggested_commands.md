# よく使うコマンド

- 依存インストール: `npm install`
- ビルド: `npm run build`
  - 出力: `dist/code.js`, `dist/ui.js`, `dist/ui.html`
- ウォッチ（並列）: `npm run watch`
  - `npm run watch:code` / `npm run watch:ui`
- Lint: `npm run lint`
- フォーマット: `npm run format`

# 実行/デバッグ
- Figma デスクトップ: 「開発プラグインをインポート」で `manifest.json` を指定（`dist/` を生成後）。
- UI を更新した場合は再ビルドして `dist/ui.html` を反映。
