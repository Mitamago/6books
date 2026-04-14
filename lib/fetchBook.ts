// 書籍情報の型定義（MVP・v2共通。絶対に変えない）
export type BookInfo = {
  asin: string;
  title: string;
  author: string;
  image: string;
  url: string; // Amazon商品URL
};

// ==============================
// 公開インターフェース（UIはここだけ呼ぶ）
// MVP・v2どちらでも同じ関数シグネチャ
// ==============================

// MVP用: URLから1冊取得
export async function fetchBookByUrl(amazonUrl: string): Promise<BookInfo> {
  return fetchByUrl_scraping(amazonUrl);
}

// v2用(後から追加): キーワードで複数候補を返す
// export async function searchBooks(query: string): Promise<BookInfo[]> {
//   return search_paapi(query);
// }

// ==============================
// 内部実装（MVPはここだけ触る）
// ==============================

// MVP実装: サーバーサイドAPIを経由してスクレイピング
async function fetchByUrl_scraping(url: string): Promise<BookInfo> {
  const response = await fetch("/api/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "書籍情報の取得に失敗しました");
  }

  return response.json();
}

// v2実装（後から差し替え）: PA-API
// async function fetchByUrl_paapi(url: string): Promise<BookInfo> { ... }
// async function search_paapi(query: string): Promise<BookInfo[]> { ... }
// async function search_googleBooks(query: string): Promise<BookInfo[]> { ... }
