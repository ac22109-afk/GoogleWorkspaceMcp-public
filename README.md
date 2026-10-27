# Google Workspace MCP — public edition

GmailとGoogle CalendarをMCPツールとして扱うTypeScript製のローカルサーバーです。AIが複数アカウントのgmailとカレンダーを操作できるようにすることを目的に作成しました。
個人運用向けの非公開実装から、公開用に設定・履歴・機能の既定値を分離して作成しました。
過去の開発履歴や実アカウントの設定・データは引き継いでいません。

## デモを動かす

Node.js 24以降で実行します。

```sh
npm ci --ignore-scripts
npm run build
npm start
```

標準起動は**架空データだけを返す読み取り専用デモ**です。Google認証は不要です。
MCPクライアントから `google_accounts_list` でalias `demo` を確認し、
`gmail_search`（account: demo）などを呼び出せます。検索条件等はデモでは適用せず固定のサンプルを返します。
`npm start` はstdio MCPクライアントとの通信待ちになるため、単体ではブラウザ画面を表示しません。
MCPクライアントには `node` と、このrepoで生成した `dist/server.js` の絶対パスを設定します。
既存の運用用MCPとは別名で登録してください。ユーザー設定を自動変更するセットアップはありません。

## 実アカウントを使う場合

明示的にJSON設定を指定したときだけGoogle接続へ切り替えられます。
repo外の専用ディレクトリに `config.example.json` をコピーして、次のように変更します。

```json
{ "mode": "google", "enableWrites": false }
```

環境変数 `GWMCP_CONFIG` にそのJSONの絶対パスを設定します。
アカウント一覧・OAuth設定・トークンは、標準ではホーム配下の `.google-workspace-mcp-public/` に保存します。
`GWMCP_DATA_DIR` で別の専用ディレクトリへ変更できます。元の運用版の保存先は指定しないでください。
その中へGoogle OAuth Desktopクライアントの `credentials.json` と、
`accounts.example.json` をもとに自分で設定した `accounts.json` を配置します。
見本のメールは設定値の説明専用です。実値をrepoやIssueへコピーしないでください。

`google_auth_start` のaccountでaliasを明示して認証します。Googleが返す実メールと設定メールが
一致しない場合、トークンを保存せず拒否します。操作時にも接続先の実メールを照合します。
`google_auth_status` のauthenticatedは保存トークンの有無を示すローカル状態で、
失効状態のオンライン検査結果ではありません。操作時にGoogleへ検証します。

## 書き込み操作

標準では読み取り専用です。JSONの `enableWrites: true` を明示した場合だけ
ラベル付与・アーカイブ・下書き・予定作成・予定更新のツールを登録します。
書き込みを有効にした場合は必要なOAuth権限も変わるため、再認証してください。
送信・完全削除のツールは提供しません。ただしGoogleのgmail.modify / gmail.compose権限は送信も許可します。
「送信APIを実装していない」と「トークンに送信権限がない」は異なります。
OAuthスコープは [Google公式資料](https://developers.google.com/workspace/gmail/api/auth/scopes) を参照してください。
確認や承認のUIはMCPクライアント側の権限設定に依存します。
カレンダー更新はIf-Matchで競合を検出し、412エラー時は自動で上書き再試行しません。

## 開発と公開時の保護

```sh
npm run check:public
npm run check
npm test
npm run build
```

- `.gitignore`：実設定・トークン・鍵・生成物を除外。
- `.githooks/pre-commit`：ステージ内容を検査。`git config core.hooksPath .githooks` で有効化。
- CI：混入検査・型チェック・テスト・ビルド・本番依存の監査。
- Dependabot：依存関係とGitHub Actionsの更新提案。
- package.jsonのprivate=true：npmへの誤公開を防止。GitHubの公開範囲とは別です。

GitHubのSecret scanning / Push protectionは追加の防御で、任意の個人情報や内部パスを
すべて検出する機能ではありません。元repoの履歴をコピーしないでください。
検証内容は [検証記録](docs/validation.md) に記載します。

## 実装の範囲

API連携の実装例であり、大規模組織向けの認証基盤ではありません。
トークンはOSのユーザーディレクトリへJSONで保存するため、端末のアクセス制御を前提とします。
秘密情報の混入チェックは限られたパターンの検査であり、完全な保証ではありません。
元実装と公開版の整備にはAI支援を使用しています。
第三者の依存ライブラリにはそれぞれのライセンスが適用されます。本コードのライセンスは未設定です。
