"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import BookInput from "@/components/BookInput";
import ShelfPreview from "@/components/ShelfPreview";
import type { BookInfo } from "@/lib/fetchBook";

// html2canvas はクライアントサイドのみ
const ShareCard = dynamic(() => import("@/components/ShareCard"), {
  ssr: false,
});

type Step = 1 | 2 | 3 | 4;

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [books, setBooks] = useState<(BookInfo | null)[]>(Array(6).fill(null));
  const [userName, setUserName] = useState("");
  const [saving, setSaving] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);


  const filledBooks = books.filter(Boolean).length;

  function handleBookUpdate(index: number, book: BookInfo | null) {
    setBooks((prev) => {
      const next = [...prev];
      next[index] = book;
      return next;
    });
  }

  async function handleComplete() {
    const validBooks = books.filter(Boolean) as BookInfo[];
    if (validBooks.length === 0) {
      alert("少なくとも1冊は入力してください");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/shelf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_name: userName, books: validBooks }),
      });

      if (!res.ok) throw new Error("保存に失敗しました");
      const { id } = await res.json();
      setShareId(id);
      setStep(4);
    } catch (e) {
      alert(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    const element = document.getElementById("share-card");
    if (!element) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(element, {
        backgroundColor: "#0a0a0a",
        scale: 1,
        useCORS: true,
        allowTaint: true,
      });
      const link = document.createElement("a");
      link.download = "my6books.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Download error:", e);
      alert("画像の生成に失敗しました");
    }
  }

  function handleCopyLink() {
    if (!shareId) return;
    const url = `${window.location.origin}/${shareId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleXShare() {
    if (!shareId) return;
    const url = `${window.location.origin}/${shareId}`;
    const text = encodeURIComponent(`私が推し続ける6冊📚 #my6books\n${url}`);
    window.open(`https://x.com/intent/tweet?text=${text}`, "_blank");
  }

  function handleViewShare() {
    if (shareId) router.push(`/${shareId}`);
  }

  return (
    <main className="min-h-screen py-12 px-4 max-w-5xl mx-auto">
      {/* ヘッダー */}
      <header className="text-center mb-12">
        <h1 className="text-3xl font-serif font-light tracking-widest text-[#f5f0e8] mb-2">
          my6books
        </h1>
        <p className="text-zinc-500 text-sm">私が推し続ける6書籍</p>
      </header>

      {/* Step 1 & 2: URL入力 + プレビュー */}
      {step !== 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左カラム: 入力 */}
          <div>
            <div className="mb-6">
              <h2 className="text-zinc-300 text-sm font-medium mb-1">
                Step 1 — AmazonリンクをURL入力
              </h2>
              <p className="text-zinc-600 text-xs">
                入力欄にAmazonのURLを貼り付けるとEnterまたはフォーカスアウトで自動取得します
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <BookInput
                  key={i}
                  index={i}
                  book={books[i]}
                  onUpdate={handleBookUpdate}
                />
              ))}
            </div>

            {/* Step 3: ユーザー名 */}
            <div className="mt-8">
              <h2 className="text-zinc-300 text-sm font-medium mb-1">
                Step 2 — あなたの名前は？
              </h2>
              <p className="text-zinc-600 text-xs mb-3">
                空欄の場合は「あなた」として表示されます
              </p>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="みさきち"
                maxLength={30}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 text-sm"
              />
            </div>

            {/* 完成ボタン */}
            <button
              onClick={handleComplete}
              disabled={saving || filledBooks === 0}
              className="mt-6 w-full py-4 bg-[#c9a84c] hover:bg-[#d4b05c] disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-medium rounded-lg transition-colors text-sm tracking-wide"
            >
              {saving
                ? "保存中..."
                : `完成する${filledBooks > 0 ? ` (${filledBooks}冊)` : ""}`}
            </button>
          </div>

          {/* 右カラム: プレビュー */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <ShelfPreview userName={userName} books={books} />
          </div>
        </div>
      )}

      {/* Step 4: 完成カード + シェア */}
      {step === 4 && shareId && (
        <div className="flex flex-col items-center gap-8">
          <div className="text-center">
            <p className="text-2xl font-serif font-light text-[#f5f0e8] mb-2">
              完成！
            </p>
            <p className="text-zinc-500 text-sm">
              シェアして友達に見せよう
            </p>
          </div>

          {/* カードプレビュー（縮小表示） */}
          <div className="w-full overflow-hidden rounded-xl border border-zinc-800">
            <div
              style={{
                transform: "scale(0.5)",
                transformOrigin: "top left",
                width: "200%",
                height: "630px",
                pointerEvents: "none",
              }}
            >
              <ShareCard userName={userName} books={books} />
            </div>
            {/* 実際の高さを設定 */}
            <div style={{ marginTop: "-315px" }} />
          </div>

          {/* 非表示の実サイズカード（html2canvas用） */}
          <div
            style={{
              position: "fixed",
              left: "-9999px",
              top: 0,
              pointerEvents: "none",
            }}
          >
            <ShareCard userName={userName} books={books} />
          </div>

          {/* シェアボタン群 */}
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-100 text-sm transition-colors"
            >
              📥 画像をダウンロード
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-100 text-sm transition-colors"
            >
              {copied ? "✅ コピーしました！" : "🔗 リンクをコピー"}
            </button>

            <button
              onClick={handleXShare}
              className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm transition-colors"
            >
              𝕏 Xでシェア
            </button>

            <button
              onClick={handleViewShare}
              className="flex items-center justify-center gap-2 w-full py-3 text-zinc-500 hover:text-zinc-300 text-sm transition-colors underline underline-offset-4"
            >
              シェアページを見る →
            </button>
          </div>

          <button
            onClick={() => {
              setStep(1);
              setShareId(null);
              setBooks(Array(6).fill(null));
              setUserName("");
            }}
            className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
          >
            もう一度作る
          </button>
        </div>
      )}
    </main>
  );
}
