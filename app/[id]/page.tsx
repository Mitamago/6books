import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { createServiceClient } from "@/lib/supabase";
import { toAmazonAffiliateUrl } from "@/lib/affiliateLink";
import type { BookInfo } from "@/lib/fetchBook";

interface ShelfData {
  id: string;
  user_name: string;
  books: BookInfo[];
  created_at: string;
}

async function getShelf(id: string): Promise<ShelfData | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shelves")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as ShelfData;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const shelf = await getShelf(params.id);
  if (!shelf) return { title: "my6books" };

  const displayName = shelf.user_name || "あなた";
  const title = `${displayName}が推し続ける6書籍 | my6books`;
  const description = shelf.books
    .slice(0, 3)
    .map((b) => b.title)
    .join("、");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: { id: string };
}) {
  const shelf = await getShelf(params.id);
  if (!shelf) notFound();

  const displayName = shelf.user_name || "あなた";
  // books を 6枠に拡張
  const books: (BookInfo | null)[] = Array(6).fill(null);
  shelf.books.forEach((b, i) => {
    if (i < 6) books[i] = b;
  });

  return (
    <main className="min-h-screen py-12 px-4 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <header className="text-center mb-10">
        <p className="text-zinc-500 text-xs mb-1 tracking-widest font-mono">
          my6books
        </p>
        <h1 className="text-2xl font-serif font-light tracking-wide text-[#f5f0e8]">
          {displayName}が推し続ける6書籍
        </h1>
      </header>

      {/* 書籍グリッド */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-12">
        {books.map((book, i) =>
          book ? (
            <a
              key={i}
              href={toAmazonAffiliateUrl(book.asin)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 cursor-pointer"
            >
              {/* 表紙 */}
              <div className="relative w-full aspect-[2/3] bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                {book.image ? (
                  <Image
                    src={book.image}
                    alt={book.title}
                    fill
                    className="object-cover group-hover:opacity-90 transition-opacity"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700 text-3xl">
                    {i + 1}
                  </div>
                )}
              </div>

              {/* テキスト */}
              <div className="w-full text-center">
                <p className="text-zinc-200 text-sm font-medium leading-snug line-clamp-2 group-hover:text-white transition-colors">
                  {book.title}
                </p>
                <p className="text-zinc-500 text-xs mt-1">{book.author}</p>
              </div>

              {/* Amazonリンク表示 */}
              <p className="text-zinc-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                Amazonで見る →
              </p>
            </a>
          ) : (
            <div
              key={i}
              className="flex flex-col items-center gap-3 opacity-20"
            >
              <div className="w-full aspect-[2/3] bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center">
                <span className="text-zinc-700 text-3xl">{i + 1}</span>
              </div>
            </div>
          )
        )}
      </div>

      {/* フッター */}
      <div className="text-center border-t border-zinc-800 pt-8">
        <p className="text-zinc-600 text-xs mb-4 font-mono tracking-widest">
          my6books.jp
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-[#c9a84c] hover:bg-[#d4b05c] text-black text-sm font-medium rounded-lg transition-colors"
        >
          あなたの6書籍を作る
        </a>
      </div>
    </main>
  );
}
