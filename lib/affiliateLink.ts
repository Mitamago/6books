// ASINからAmazonアフィリエイトURLを生成
// シェアページ（/[id]）でのみ使用すること
export function toAmazonAffiliateUrl(asin: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG;
  return `https://www.amazon.co.jp/dp/${asin}?tag=${tag}`;
}

// 将来: 楽天アフィリエイトURLを生成（v2で追加）
// export function toRakutenAffiliateUrl(isbn: string): string { ... }
