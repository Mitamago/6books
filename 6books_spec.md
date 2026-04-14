# 「私が推し続ける6書籍」シェアアプリ — 仕様書

## プロダクト概要

ユーザーが「自分の人生を変えた6冊」を選んでビジュアルカードを生成し、
シェアリンク付きで1枚の画像として拡散できる **書籍棚シェアアプリ**。

- 初期想定ユーザー: 10,000人（共有先: 400,000人）
- スケール目標: 4,000,000人
- ドメイン例: `my6books.jp` or `6books.app`

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| バックエンド API | Next.js API Routes (Route Handlers) |
| DB / ストレージ | Supabase (PostgreSQL + Storage) |
| 画像生成 | `html2canvas` または `satori` + `@vercel/og` |
| Amazon情報取得 | PA-API 5.0 (Amazon Product Advertising API) ※後述の代替案あり |
| デプロイ | Vercel |
| OGP | `next/og` (Edge Runtime) |

---

## ファイル構造（シンプル構成）

```
my6books/
├── app/
│   ├── layout.tsx               # グローバルレイアウト・フォント設定
│   ├── page.tsx                 # Step 1–3: メイン入力UI
│   ├── [id]/
│   │   └── page.tsx             # 完成カード表示・シェアページ
│   └── api/
│       ├── book/route.ts        # Amazon情報スクレイピング or PA-API
│       └── shelf/route.ts       # 棚データの保存・取得 (Supabase)
├── components/
│   ├── BookInput.tsx            # URL入力 + 書籍情報カード（1冊分）
│   ├── ShelfPreview.tsx         # 6冊並んだプレビュー（リアルタイム更新）
│   └── ShareCard.tsx            # 最終カード（画像書き出し対象）
├── lib/
│   ├── fetchBook.ts             # Amazon URL解析・情報取得ロジック
│   └── supabase.ts              # Supabaseクライアント
├── public/
│   └── og-template.png          # OGPベース画像（任意）
└── supabase/
    └── schema.sql               # DBスキーマ定義
```

> ⚠️ コンポーネントは最小限に。UIロジックはページファイルに集約してOK。

---

## 画面フロー（4ステップ）

```
[Step 1] Amazonリンク入力（6冊分）
    ↓ 自動取得
[Step 2] 書籍情報確認・編集
    ↓
[Step 3] ユーザー名入力 → プレビュー更新
    ↓
[Step 4] 完成カード表示 → 画像DL + シェアリンク発行
```

---

## Step 1 — Amazonリンク入力

### UI
- 6つのURLインプット欄（番号付き）
- 1つ入力するたびにリアルタイムで書籍情報を取得（フォーカスアウト or Enter）
- 全6冊入力しなくても先に進める（未入力欄はグレーのプレースホルダー）

### インプット仕様
```
対応URLフォーマット:
  - https://www.amazon.co.jp/dp/ASIN
  - https://www.amazon.co.jp/gp/product/ASIN
  - https://amzn.to/xxxxx（短縮URL → サーバー側でリダイレクト追跡してASIN抽出）
```

---

## 書籍情報取得レイヤーの設計思想

### ✅ MVP → v2 改修を最小にする設計原則

**やりたいことの変遷:**
```
MVP  : ユーザーがAmazonリンクを貼る → 書籍情報を取得
v2   : タイトル/著者名で検索 → 候補リストから選ぶ → 書籍情報が入る
```

**変わること:** 入力インターフェース（URLインプット → テキスト検索UI）
**変わらないこと:** 書籍情報のデータ構造、プレビューUI、保存ロジック、シェア機能

→ `lib/fetchBook.ts` を「**書籍情報の唯一の窓口（アダプター）**」として設計し、
　 内部実装だけ差し替えればUIに変更不要な構造にする。

---

### アダプターパターン（lib/fetchBook.ts）

```typescript
// 書籍情報の型定義（MVP・v2共通。絶対に変えない）
export type BookInfo = {
  asin:   string;
  title:  string;
  author: string;
  image:  string;
  url:    string;  // Amazon商品URL
};

// ==============================
// 公開インターフェース（UIはここだけ呼ぶ）
// MVP・v2どちらでも同じ関数シグネチャ
// ==============================

// MVP用: URLから1冊取得
export async function fetchBookByUrl(amazonUrl: string): Promise<BookInfo>

// v2用(後から追加): キーワードで複数候補を返す
export async function searchBooks(query: string): Promise<BookInfo[]>

// ==============================
// 内部実装（MVPはここだけ触る）
// ==============================

// MVP実装: スクレイピング
async function fetchByUrl_scraping(url: string): Promise<BookInfo> { ... }

// v2実装（後から差し替え）: PA-API or Google Books API
async function fetchByUrl_paapi(url: string): Promise<BookInfo>    { ... }
async function search_paapi(query: string): Promise<BookInfo[]>    { ... }
async function search_googleBooks(query: string): Promise<BookInfo[]> { ... }
```

### UIコンポーネントとの対応

```
MVP の BookInput.tsx:
  URLインプット → fetchBookByUrl(url) → BookInfo → 表示

v2 の BookInput.tsx（差し替え）:
  テキスト検索 → searchBooks(query) → BookInfo[] → 候補リスト → 選択 → BookInfo → 表示
                                               ↑ここだけ追加
```

UIが呼ぶ関数・受け取る型（`BookInfo`）は変わらないため、
**ShelfPreview・ShareCard・保存ロジックは一切修正不要**。

---

## Step 2 — 書籍情報取得・編集

### MVP: 情報取得 API（`/api/book`）

**スクレイピング方式（初期開発向け・APIキー不要）**

```typescript
取得項目:
  - title:   og:title または h1#productTitle
  - author:  .author .contributorNameID または span.author
  - image:   og:image または #imgBlkFront[src]
  - asin:    URLから正規表現で抽出

対応URLパターン:
  - https://www.amazon.co.jp/dp/ASIN
  - https://www.amazon.co.jp/gp/product/ASIN
  - https://amzn.to/xxxxx（サーバー側でリダイレクト追跡してASIN抽出）
```

> **v2移行時（精度重視）**: `fetchByUrl_scraping` を `fetchByUrl_paapi` に差し替えるだけ。
> Amazon PA-API 5.0 + `amazon-paapi` npm パッケージ。アソシエイトID `tororo0f4-22` 使用。

### 取得後のUI（BookInputコンポーネント）

```
┌─────────────────────────────────────┐
│  [表紙画像]  タイトル（編集可）       │
│             著者名（編集可）         │
│             ✏️ 画像をタップで差し替え  │
└─────────────────────────────────────┘
```

- **タイトル・著者名**: `contentEditable` or インラインinputで直接編集
- **表紙画像の差し替え**: 画像クリック → ファイルアップロードモーダル or URL入力
- **再取得ボタン**: URLを修正して再フェッチできる

---

## Step 3 — ユーザー名入力

```
┌────────────────────────────────┐
│  あなたの名前は？               │
│  [________________] ✏️          │
│                                │
│  ▼ プレビュー（リアルタイム更新）  │
│  「___さんが推し続ける6書籍」     │
└────────────────────────────────┘
```

- 入力するたびにShelfPreviewのタイトルが即時更新
- 名前は任意（空の場合はデフォルト表示）
- （）は不要。`{name}が推し続ける6書籍` のシンプルな表記

---

## Step 4 — 完成カード + シェア

### 完成カードデザイン仕様（ShareCard.tsx）

```
┌──────────────────────────────────────────┐
│     みさきちが推し続ける6書籍              │
│                                          │
│  [表紙1]  [表紙2]  [表紙3]               │
│  タイトル  タイトル  タイトル             │
│  著者      著者      著者                 │
│                                          │
│  [表紙4]  [表紙5]  [表紙6]               │
│  タイトル  タイトル  タイトル             │
│  著者      著者      著者                 │
│                                          │
│              my6books.jp                 │
└──────────────────────────────────────────┘
```

- サイズ: 1200×630px（OGP標準）または 1080×1080px（正方形・SNS向け）
- 書き出し: `html2canvas` → PNG ダウンロード

### シェアリンク発行

```
保存データ（Supabase: shelves テーブル）:
  - id: uuid (primary key)
  - user_name: text
  - books: jsonb (6冊分の情報配列)
  - created_at: timestamp

シェアURL: https://my6books.jp/{id}
```

### シェアUI

```
┌──────────────────────────────────────┐
│  🎉 完成！                            │
│                                      │
│  [カード画像プレビュー]               │
│                                      │
│  [📥 画像をダウンロード]              │
│  [🔗 リンクをコピー]                  │
│  [𝕏 Xでシェア] [📘 Facebookでシェア]  │
└──────────────────────────────────────┘
```

Xシェア文例:
```
私が推し続ける6冊📚 #my6books
https://my6books.jp/{id}
```

---

## アフィリエイトリンク設計

### 方針
シェアページ（`/[id]`）で書籍リンクをクリックすると、
**みさきちのアフィリエイトIDが乗ったリンク**に変換して遷移する。
ユーザー側の登録・設定は一切不要。

### アフィリエイトID

```env
# .env.local に追加
NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG=tororo0f4-22
NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID=（楽天アフィリエイトID）
```

### リンク生成ロジック（lib/affiliateLink.ts として切り出す）

```typescript
// ASINからAmazonアフィリエイトURLを生成
export function toAmazonAffiliateUrl(asin: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG;
  return `https://www.amazon.co.jp/dp/${asin}?tag=${tag}`;
}

// 将来: 楽天アフィリエイトURLを生成（v2で追加）
export function toRakutenAffiliateUrl(isbn: string): string { ... }
```

### どこでリンクを生成するか

- **入力ページ（`/`）**: 通常のAmazon URLのまま（アフィリエイトIDは乗せない）
- **シェアページ（`/[id]`）**: `toAmazonAffiliateUrl(asin)` を呼んでアフィリエイトURL生成

```typescript
// app/[id]/page.tsx のイメージ
const affiliateUrl = toAmazonAffiliateUrl(book.asin);
// → https://www.amazon.co.jp/dp/4820729XXX?tag=tororo0f4-22
```

> シェアページにだけIDを乗せる理由: 「作成者本人がリンクを踏んでも報酬にならない」
> Amazonアソシエイト規約上、自己購入は無効なため。

### BookInfo型への影響

ASINを保存しておけば動的に生成できるので、`BookInfo`型・DBスキーマの変更は**不要**。

```typescript
// 現行のBookInfo型のまま使える
export type BookInfo = {
  asin:   string;  // ← これがあればアフィリエイトURL生成可能
  title:  string;
  author: string;
  image:  string;
  url:    string;
};
```

### 将来のv2（ユーザー自前IDへの移行）

`lib/affiliateLink.ts` の中だけ変えればOK。
シェアページのUIは一切触らなくてよい。

```typescript
// v2: ユーザーごとのIDを使う場合
export function toAmazonAffiliateUrl(asin: string, userId?: string): string {
  const tag = userId
    ? getUserAssociateTag(userId)          // ユーザー登録IDを使う
    : process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG; // デフォルト（みさきち）
  return `https://www.amazon.co.jp/dp/${asin}?tag=${tag}`;
}
```

---

## Supabase スキーマ

```sql
-- supabase/schema.sql

create table shelves (
  id uuid primary key default gen_random_uuid(),
  user_name text not null default '',
  books jsonb not null default '[]',
  created_at timestamptz default now()
);

-- booksのJSONB構造
-- [
--   {
--     "asin": "4820729...",
--     "title": "ゼロ・トゥ・ワン",
--     "author": "ピーター・ティール",
--     "image": "https://m.media-amazon.com/images/...",
--     "url": "https://www.amazon.co.jp/dp/..."
--   },
--   ... (最大6件)
-- ]

-- RLS（Row Level Security）設定
alter table shelves enable row level security;

-- 読み取りは全員OK（シェアリンクで誰でも見れる）
create policy "Public read" on shelves
  for select using (true);

-- 書き込みはAPIキー経由のみ（service_role key使用）
create policy "Service write" on shelves
  for insert using (true);
```

---

## 環境変数

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Amazon PA-API（採用する場合）
AMAZON_ACCESS_KEY=
AMAZON_SECRET_KEY=
AMAZON_ASSOCIATE_TAG=tororo0f4-22
AMAZON_REGION=us-east-1
```

---

## Claude Codeへの初期プロンプト（バイブコーディング用）

```
Next.js 14 (App Router) + TypeScript + Tailwind CSS で
「私が推し続ける6書籍」シェアアプリを作ってください。

## 重要: 将来の拡張を見越した設計
現在はMVP（AmazonリンクURLを入力して書籍情報を取得する）だが、
将来v2でタイトル/著者名テキスト検索UIに切り替える予定。
UIを変えてもデータ構造・保存ロジックは変わらないよう、
書籍情報取得ロジックは lib/fetchBook.ts に完全に閉じ込め、
アダプターパターンで設計すること。

## BookInfo型（絶対に変えない共通型）
export type BookInfo = {
  asin: string;
  title: string;
  author: string;
  image: string;
  url: string;
};

## lib/fetchBook.ts の設計
- 公開インターフェース: fetchBookByUrl(amazonUrl: string): Promise<BookInfo>
  （将来: searchBooks(query: string): Promise<BookInfo[]> を追加予定）
- 内部実装: MVPはスクレイピング（cheerio）で実装
  関数名を fetchByUrl_scraping として、v2で差し替えやすくすること

## 機能要件（MVP）
1. URLインプット6つ → fetchBookByUrl() 呼び出し → BookInfo取得・表示
2. タイトル・著者名はインライン編集可
3. 表紙画像クリックで差し替え可
4. ユーザー名入力でプレビューリアルタイム更新
5. 完成ボタン:
   - Supabaseに保存 → UUID発行 → シェアURL: /[id]
   - html2canvas でPNG書き出し・ダウンロード
   - Xシェアボタン表示

## ファイル構成
app/page.tsx, app/[id]/page.tsx,
app/api/book/route.ts, app/api/shelf/route.ts,
components/BookInput.tsx, components/ShelfPreview.tsx, components/ShareCard.tsx,
lib/fetchBook.ts, lib/supabase.ts

## デザイン
- 黒背景・オフホワイト文字のミニマルな高級感
- 書体: Noto Serif JP（日本語）+ Playfair Display（英字）
- カードサイズ: 1200x630px（OGP標準）
- 6冊を2行×3列グリッドで表示
- フッターに「my6books.jp」のブランド表記

## 重要: アフィリエイトリンク
- lib/affiliateLink.ts を作成し、toAmazonAffiliateUrl(asin) を実装
- ASINから https://www.amazon.co.jp/dp/{ASIN}?tag={ASSOCIATE_TAG} を生成
- アフィリエイトリンクはシェアページ（/[id]）でのみ使用（入力ページでは通常URLを使う）
- 環境変数: NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG=tororo0f4-22

## 環境変数
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG

まず package.json と必要なパッケージのインストールから始めてください。
```

---

## CLAUDE.md（プロジェクトルートに置くファイル）

このファイルをプロジェクトルートに `CLAUDE.md` という名前で作成すること。
Claude Codeが起動するたびに自動で読み込み、ルールを記憶する。

```markdown
# my6books — Claude Codeへの指示

## このプロジェクトについて
「私が推し続ける6書籍」シェアアプリ。
Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase。

## 必ずやること

### commit・pushの前に必ず確認する
コードの実装が完了したら、以下の形式でみさきちに確認を求めること。
承認を得るまで git commit・git push は絶対に実行しないこと。

確認フォーマット:
---
実装が完了しました。

変更内容: [何を実装したか1〜3行で]
変更ファイル: [ファイル名リスト]
コミットメッセージ案: [type]: [日本語で何をしたか]

commit・pushしてよいですか？
---

### ブランチルール
- main に直接 push しない
- develop に直接 push しない
- 作業は必ず feature/* または fix/* ブランチで行う
- ブランチ名例: feature/book-input, fix/scraping-author

### コミットメッセージ形式（Conventional Commits）
<type>: <日本語で何をしたか>

type:
  feat     = 新機能
  fix      = バグ修正
  refactor = コード整理（動作変わらない）
  style    = デザイン・CSS
  docs     = ドキュメント・コメント
  chore    = 設定・環境構築

## 設計上の注意

### 書籍情報取得は lib/fetchBook.ts だけに書く
UIから直接スクレイピングや外部API呼び出しをしない。
将来URLからテキスト検索に切り替えるとき、このファイルだけ変える設計。

### アフィリエイトリンクは lib/affiliateLink.ts だけに書く
シェアページ（/[id]）でのみ toAmazonAffiliateUrl(asin) を呼ぶ。
入力ページ（/）では通常のAmazon URLを使う。

### BookInfo型は変えない
export type BookInfo = {
  asin: string; title: string; author: string; image: string; url: string;
}
この型はMVP→v2を通じて共通の契約。変更する場合は必ず確認すること。
```

---

## Git運用ルール

### ブランチ戦略（GitFlow簡易版）

```
main        # 本番（Vercelが自動デプロイ）。直接pushは絶対禁止。
develop     # 開発統合ブランチ。ここにPRをマージしていく。
feature/*   # 機能開発ブランチ。developから切る。
fix/*       # バグ修正ブランチ。
```

```bash
# ブランチの切り方
git checkout develop
git checkout -b feature/book-input    # 例: BookInputコンポーネント実装
git checkout -b feature/share-page
git checkout -b fix/scraping-author
```

### コミットメッセージ規則（Conventional Commits）

```
<type>: <日本語で何をしたか>

type一覧:
  feat     # 新機能
  fix      # バグ修正
  refactor # 動作変わらないコード整理
  style    # デザイン・CSS調整
  docs     # ドキュメント・コメント
  chore    # 設定ファイル・環境構築
```

```bash
# 例
feat: BookInputコンポーネントにURL入力欄を追加
fix: amzn.to短縮URLのリダイレクト追跡が失敗する問題を修正
refactor: fetchBook.tsをアダプターパターンに整理
style: ShelfPreviewのグリッドレイアウトをモバイル対応
chore: Supabaseクライアントの初期設定を追加
```

### ⚠️ Claude Codeへの指示（重要）

**commit・pushは必ずみさきちに確認を取ってから行うこと。**
コードを書いたあと、以下の形式で確認を求めること：

```
実装が完了しました。
変更内容: [何を実装したか]
コミットメッセージ案: feat: BookInputコンポーネントを実装

commit・pushしてよいですか？
```

承認が得られてから初めて以下を実行する：
```bash
git add .
git commit -m "feat: ..."
git push origin feature/xxx
```

### PRの出し方

developへのマージはPR（Pull Request）経由。
PRタイトルは日本語でOK。説明欄に「何をしたか・なぜしたか」を書く。

```
タイトル例: BookInputコンポーネントの実装
説明:
  - AmazonURL入力欄を追加
  - fetchBookByUrl()を呼んで書籍情報を自動取得
  - タイトル・著者名のインライン編集に対応
```

---

## 開発の進め方（推奨順）

1. `npx create-next-app@latest my6books --typescript --tailwind --app`
2. Supabaseプロジェクト作成 → schema.sql 実行 → 環境変数設定
3. `/api/book` — スクレイピングAPIを先に動かす（最重要）
4. `BookInput.tsx` — 1冊分のUIを完成させる
5. `ShelfPreview.tsx` — 6冊並べてプレビュー
6. `/api/shelf` — Supabase保存
7. `app/[id]/page.tsx` — シェアページ + OGP
8. `ShareCard.tsx` + html2canvas — 画像ダウンロード
9. Vercelデプロイ

---

## スケール対応メモ（将来）

| フェーズ | 対応 |
|---|---|
| 〜10K users | Vercel無料プラン + Supabase無料プラン |
| 〜400K shares | Vercel Pro + Supabase Pro（$25/月） |
| 4M users | Supabase DB indexing、CDN画像キャッシュ、Redis for rate limiting |

スクレイピング → PA-API移行はユーザー数が増えたタイミングで。
アソシエイトID `tororo0f4-22` はそのまま使用可能。