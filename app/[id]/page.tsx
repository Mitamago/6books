import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { createServiceClient } from "@/lib/supabase";
import { toAmazonAffiliateUrl } from "@/lib/affiliateLink";
import type { BookInfo } from "@/lib/fetchBook";
import BackButton from "@/components/BackButton";

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
  const description = shelf.books.slice(0, 3).map((b) => b.title).join("、");
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
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
  const books: (BookInfo | null)[] = Array(6).fill(null);
  shelf.books.forEach((b, i) => { if (i < 6) books[i] = b; });

  return (
    <main className="min-h-screen bg-white px-5 pt-10 pb-12 max-w-lg mx-auto">
      {/* ヘッダー */}
      <header className="text-center mb-8">
        <p className="text-xs text-black mb-1 tracking-widest">my6books</p>
        <h1 className="text-2xl font-black" style={{ color: "#e2a9f1" }}>
          {displayName}が推し続ける6書籍
        </h1>
      </header>

      {/* 書籍グリッド */}
      <div className="flex flex-col gap-5 mb-10">
        {books.map((book, i) =>
          book ? (
            <a
              key={i}
              href={toAmazonAffiliateUrl(book.asin)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-4 items-start active:opacity-70 transition-opacity text-black"
            >
              <div className="relative w-24 h-32 flex-shrink-0 rounded-xl overflow-hidden border-2 border-black">
                {book.image ? (
                  <Image
                    src={book.image}
                    alt={book.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-2xl">
                    {i + 1}
                  </div>
                )}
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm font-bold leading-snug mb-1 line-clamp-3">
                  {book.title}
                </p>
                <p className="text-xs text-black">{book.author}</p>
                <p className="text-xs text-black mt-2">Amazonで見る →</p>
              </div>
            </a>
          ) : null
        )}
      </div>

      {/* フッター CTA */}
      <div className="text-center border-t-2 border-black pt-8">
        <p className="text-xs text-black mb-4 tracking-widest">my6books.jp</p>
        <a
          href="/"
          className="inline-block w-full h-14 rounded-2xl border-2 border-black text-base font-bold flex items-center justify-center text-black"
          style={{ backgroundColor: "#c9a3e0" }}
        >
          あなたの6書籍を作る
        </a>
        <div className="mt-3">
          <BackButton shareId={shelf.id} />
        </div>
      </div>
    </main>
  );
}
