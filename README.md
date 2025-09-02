# JIS準拠チェッカー (v0.1 PoC)

- Figma Plugin（Manifest v2）
- 最小チェック：
  - 色コントラスト（WCAG 2.1/2.2 AA相当）
  - 代替テキスト（Image/Vectorに対するdescription有無）
  - タッチターゲット（最小44×44px）
- レポート：CSV/Markdown（UIからダウンロード）
- 監査ログ：`exports/audit_log_YYYYMMDD_HHMM.json`（UIからダウンロード）
- JISマッピング：`/rules/jis_mapping.json`（差し替え可能）

## I/O仕様（例示）

- CSVヘッダ例：

  ```
  timestamp,frameName,nodeId,nodeName,issueType,severity,details,suggestedFix,JISClauseId
  ```

- Markdownテンプレ（先頭セクションに含む）
  - JIS準拠チェッカーレポート
  - 検査日時 / 検査者 / 対象ファイル
  - JIS/WCAG版 / 合否集計

## 開発手順

1. 依存インストール：`npm install`
2. ビルド：`npm run build`（`dist/code.js` と `dist/ui.js` を生成）
3. Figma デスクトップアプリで「開発プラグインをインポート」から本ディレクトリの `manifest.json` を指定
4. フレームを選択してプラグイン実行 → UI右パネルのKPIと出力ボタンを確認

## 実装メモ

- 背景色推定は親の最初のSolid塗り、見つからなければ白と仮定（保守的判定の根拠をdetailsに記録）
- 代替テキストは `node.description` の有無で判定（画像塗り or ベクターを対象）
- タッチターゲットは44x44px未満でエラー（最小実装）
- 例外はクラッシュさせず、UIに警告表示＋ログ化
