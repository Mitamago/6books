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

### アフィリエイトリンクは lib/affiliateLink.ts だけに書く
シェアページ（/[id]）でのみ toAmazonAffiliateUrl(asin) を呼ぶ。
入力ページ（/）では通常のAmazon URLを使う。

### BookInfo型は変えない
export type BookInfo = {
  asin: string; title: string; author: string; image: string; url: string;
}
