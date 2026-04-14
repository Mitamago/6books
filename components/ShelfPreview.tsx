"use client";

import Image from "next/image";
import type { BookInfo } from "@/lib/fetchBook";

interface ShelfPreviewProps {
  userName: string;
  books: (BookInfo | null)[];
}

export default function ShelfPreview({ userName, books }: ShelfPreviewProps) {
  const displayName = userName.trim() || "あなた";

  return (
    <div className="w-full">
      <h2 className="text-zinc-400 text-sm mb-3 text-center">プレビュー</h2>

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-full max-w-2xl mx-auto">
        {/* タイトル */}
        <h3 className="text-center text-zinc-100 font-serif text-lg mb-6 leading-relaxed">
          {displayName}が推し続ける6書籍
        </h3>

        {/* 6冊グリッド */}
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => {
            const book = books[i];
            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="relative w-full aspect-[2/3] bg-zinc-900 rounded overflow-hidden">
                  {book?.image ? (
                    <Image
                      src={book.image}
                      alt={book.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-zinc-700 text-2xl">{i + 1}</span>
                    </div>
                  )}
                </div>
                <div className="w-full text-center">
                  <p className="text-zinc-300 text-xs leading-tight line-clamp-2 font-medium">
                    {book?.title || ""}
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5 truncate">
                    {book?.author || ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <p className="text-center text-zinc-600 text-xs mt-6 font-mono tracking-widest">
          my6books.jp
        </p>
      </div>
    </div>
  );
}
