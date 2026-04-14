"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { fetchBookByUrl, type BookInfo } from "@/lib/fetchBook";

interface BookInputProps {
  index: number;
  book: BookInfo | null;
  onUpdate: (index: number, book: BookInfo | null) => void;
}

export default function BookInput({ index, book, onUpdate }: BookInputProps) {
  const [url, setUrl] = useState(book?.url || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFetch() {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    try {
      const info = await fetchBookByUrl(url.trim());
      onUpdate(index, info);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleFetch();
  }

  function handleTitleEdit(e: React.FocusEvent<HTMLInputElement>) {
    if (book) onUpdate(index, { ...book, title: e.target.value });
    setEditingTitle(false);
  }

  function handleAuthorEdit(e: React.FocusEvent<HTMLInputElement>) {
    if (book) onUpdate(index, { ...book, author: e.target.value });
    setEditingAuthor(false);
  }

  function handleImageClick() {
    fileInputRef.current?.click();
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !book) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result && book) {
        onUpdate(index, { ...book, image: ev.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  }

  function handleClear() {
    setUrl("");
    setError("");
    onUpdate(index, null);
  }

  return (
    <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-950">
      {/* URL入力エリア */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-zinc-500 text-sm font-mono w-5">{index + 1}</span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleFetch}
          placeholder="Amazon URLを貼り付け..."
          className="flex-1 bg-transparent border-b border-zinc-700 text-zinc-300 placeholder-zinc-600 text-sm py-1 focus:outline-none focus:border-zinc-400 transition-colors"
        />
        {book && (
          <button
            onClick={handleClear}
            className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
            title="クリア"
          >
            ✕
          </button>
        )}
      </div>

      {/* エラー表示 */}
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      {/* ローディング */}
      {loading && (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-2">
          <span className="animate-pulse">書籍情報を取得中...</span>
        </div>
      )}

      {/* 書籍情報カード */}
      {book && !loading && (
        <div className="flex gap-3 mt-2">
          {/* 表紙画像 */}
          <div
            className="relative w-16 h-24 flex-shrink-0 cursor-pointer group"
            onClick={handleImageClick}
            title="クリックして画像を差し替え"
          >
            {book.image ? (
              <Image
                src={book.image}
                alt={book.title}
                fill
                className="object-cover rounded group-hover:opacity-70 transition-opacity"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 rounded flex items-center justify-center">
                <span className="text-zinc-600 text-xs">No Image</span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs bg-black/60 rounded px-1 py-0.5">
                ✏️
              </span>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleImageFile}
          />

          {/* テキスト情報 */}
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                defaultValue={book.title}
                onBlur={handleTitleEdit}
                className="w-full bg-zinc-900 text-zinc-100 text-sm font-medium rounded px-1 py-0.5 focus:outline-none border border-zinc-600"
              />
            ) : (
              <p
                className="text-zinc-100 text-sm font-medium leading-snug cursor-pointer hover:text-white truncate"
                onClick={() => setEditingTitle(true)}
                title="クリックして編集"
              >
                {book.title}
              </p>
            )}

            {editingAuthor ? (
              <input
                autoFocus
                defaultValue={book.author}
                onBlur={handleAuthorEdit}
                className="w-full bg-zinc-900 text-zinc-400 text-xs rounded px-1 py-0.5 mt-1 focus:outline-none border border-zinc-600"
              />
            ) : (
              <p
                className="text-zinc-400 text-xs mt-1 cursor-pointer hover:text-zinc-300 truncate"
                onClick={() => setEditingAuthor(true)}
                title="クリックして編集"
              >
                {book.author}
              </p>
            )}

            <p className="text-zinc-600 text-xs mt-1 font-mono">
              ASIN: {book.asin}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
