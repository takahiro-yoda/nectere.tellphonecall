# 架電数ダッシュボード (nectere.tellphonecall)

社内の架電数を記録し、今週/今月の件数と目標までの残りを視覚的に表示するモチベーション用アプリです。

## 機能

- **今週/今月の架電数** … 大きな数字で表示
- **あと何件！** … 週・月の目標を設定すると、残り件数を表示。達成時は「目標達成！」と表示
- **電話先一覧** … ボタンで開閉。今週/今月の架電一覧をテーブルで表示
- **架電を記録** … 電話先（必須）・メモ（任意）を入力して記録
- **目標を設定** … 今週・今月の目標件数を設定・変更

## セットアップ

1. リポジトリをクローンし、依存関係をインストール。

```bash
npm install
```

2. 環境変数を設定。`.env.example` をコピーして `.env` を作成し、PostgreSQL の接続URLを設定。

```bash
cp .env.example .env
# .env の DATABASE_URL を編集（Neon / Vercel Postgres / ローカル Postgres など）
```

3. マイグレーション（初回のみ）。

```bash
npm run db:push
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く。

## スクリプト

- `npm run dev` … 開発サーバー起動
- `npm run build` … 本番ビルド
- `npm run start` … 本番サーバー起動
- `npm run db:push` … Prisma スキーマを DB に反映
- `npm run db:studio` … Prisma Studio で DB を閲覧

## Vercel へのデプロイ

1. **PostgreSQL を用意する**  
   Vercel のサーバーレスでは SQLite が使えないため、[Neon](https://neon.tech) や [Vercel Postgres](https://vercel.com/storage/postgres) などで PostgreSQL を作成し、接続URLを取得する。

2. **Vercel にプロジェクトをインポート**  
   [Vercel](https://vercel.com) で GitHub リポジトリをインポートする。

3. **環境変数を設定**  
   Vercel のプロジェクト設定 → Environment Variables で次を追加する。
   - `DATABASE_URL` … 上記で取得した PostgreSQL の接続URL（Production / Preview / Development で設定）

4. **デプロイ**  
   デプロイが走ると `prisma generate && next build` が実行される。初回デプロイ後、DB が空の場合はローカルで `npx prisma db push` を実行するか、Vercel の「Deployments」→ 該当デプロイの「Building」ログで Prisma が通っているか確認する。必要なら Vercel の「Settings」→「General」で Build Command を `prisma generate && next build` にしていることを確認する。

5. **DB の初期反映（初回のみ）**  
   本番用 DB に対してスキーマを反映するには、ローカルで `DATABASE_URL` を本番用の URL に一時的に書き換えて `npm run db:push` を実行するか、CI や Vercel の prebuild で実行する方法がある。

## 技術

- Next.js 16 (App Router)
- Tailwind CSS
- PostgreSQL + Prisma
