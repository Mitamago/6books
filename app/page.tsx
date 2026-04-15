"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { fetchBookByUrl, type BookInfo } from "@/lib/fetchBook";

const ShareCard = dynamic(() => import("@/components/ShareCard"), {
  ssr: false,
});

type Step = "url" | "confirm" | "name" | "share";

type RestorePayload = {
  books: (BookInfo | null)[];
  userName: string;
  shareId: string;
  shareUrl: string;
};

function ShareRestorer({ onRestore }: { onRestore: (p: RestorePayload) => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const id = searchParams.get("share");
    if (!id) return;
    fetch(`/api/shelf?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data || data.error) return;
        const filled: (BookInfo | null)[] = Array(6).fill(null);
        (data.books as BookInfo[]).forEach((b, i) => { if (i < 6) filled[i] = b; });
        onRestore({
          books: filled,
          userName: data.user_name ?? "",
          shareId: id,
          shareUrl: `${window.location.origin}/${id}`,
        });
        router.replace("/");
      })
      .catch(() => {});
  }, [searchParams, router, onRestore]);

  return null;
}

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("url");
  const [urls, setUrls] = useState<string[]>(Array(6).fill(""));
  const [books, setBooks] = useState<(BookInfo | null)[]>(Array(6).fill(null));
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<(string | null)[]>(Array(6).fill(null));
  const [userName, setUserName] = useState("");
  const [saving, setSaving] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const handleRestore = useCallback((p: RestorePayload) => {
    setBooks(p.books);
    setUserName(p.userName);
    setShareId(p.shareId);
    setShareUrl(p.shareUrl);
    setStep("share");
  }, []);

  async function fetchBook(index: number, url: string) {
    if (!url.trim()) return;
    setLoadingIndex(index);
    setErrors((prev) => { const n = [...prev]; n[index] = null; return n; });
    try {
      const info = await fetchBookByUrl(url.trim());
      setBooks((prev) => { const n = [...prev]; n[index] = info; return n; });
    } catch (e) {
      setErrors((prev) => {
        const n = [...prev];
        n[index] = e instanceof Error ? e.message : "取得失敗";
        return n;
      });
    } finally {
      setLoadingIndex(null);
    }
  }

  function handleUrlChange(index: number, value: string) {
    setUrls((prev) => { const n = [...prev]; n[index] = value; return n; });
  }

  async function handleUrlBlurOrEnter(index: number) {
    await fetchBook(index, urls[index]);
  }

  function handleImageFile(index: number, file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setBooks((prev) => {
          const n = [...prev];
          if (n[index]) n[index] = { ...n[index]!, image: ev.target!.result as string };
          return n;
        });
      }
    };
    reader.readAsDataURL(file);
  }

  function handleTitleEdit(index: number, value: string) {
    setBooks((prev) => {
      const n = [...prev];
      if (n[index]) n[index] = { ...n[index]!, title: value };
      return n;
    });
  }

  function handleAuthorEdit(index: number, value: string) {
    setBooks((prev) => {
      const n = [...prev];
      if (n[index]) n[index] = { ...n[index]!, author: value };
      return n;
    });
  }

  async function handleComplete() {
    const validBooks = books.filter(Boolean) as BookInfo[];
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
      setShareUrl(`${window.location.origin}/${id}`);
      setStep("share");
    } catch (e) {
      alert(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleXShare() {
    const text = encodeURIComponent(`私が推し続ける6冊📚 #my6books\n${shareUrl}`);
    window.open(`https://x.com/intent/tweet?text=${text}`, "_blank");
  }

  async function handleSaveImage() {
    const element = document.getElementById("share-card");
    if (!element) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(element, {
      backgroundColor: "#e2a9f1",
      scale: 1,
      useCORS: true,
      allowTaint: true,
    });
    const link = document.createElement("a");
    link.download = "my6books.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  const filledCount = books.filter(Boolean).length;

  // ===== STEP: URL入力 =====
  if (step === "url") {
    return (
      <main className="min-h-screen bg-white px-5 pt-10 pb-10 max-w-lg mx-auto flex flex-col">
        <Suspense fallback={null}>
          <ShareRestorer onRestore={handleRestore} />
        </Suspense>
        <h1 className="text-2xl font-black text-black text-center mb-1">
          私が推し続ける6書籍
        </h1>
        <p className="text-center text-sm text-gray-500 mb-8">URLを入れてね</p>

        <div className="flex flex-col gap-4 flex-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium select-none">
                  {i + 1}.
                </span>
                <input
                  type="url"
                  inputMode="url"
                  value={urls[i]}
                  onChange={(e) => handleUrlChange(i, e.target.value)}
                  onBlur={() => handleUrlBlurOrEnter(i)}
                  onKeyDown={(e) => e.key === "Enter" && handleUrlBlurOrEnter(i)}
                  placeholder="https://amzn.asia/..."
                  disabled={loadingIndex === i}
                  className="w-full h-14 pl-9 pr-4 bg-white text-black text-sm border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-[#e2a9f1] disabled:bg-gray-50 disabled:text-gray-400 placeholder-gray-300"
                />
                {loadingIndex === i && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">
                    取得中...
                  </span>
                )}
                {books[i] && loadingIndex !== i && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#e2a9f1] text-lg">
                    ✓
                  </span>
                )}
              </div>
              {errors[i] && (
                <p className="text-red-500 text-xs pl-2">{errors[i]}</p>
              )}
              {books[i] && !errors[i] && (
                <p className="text-gray-500 text-xs pl-2 truncate">
                  {books[i]!.title}
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => setStep("confirm")}
          disabled={filledCount === 0}
          className="mt-8 w-full h-14 rounded-2xl text-base font-bold border-2 border-black transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
          style={{ backgroundColor: filledCount > 0 ? "#e2a9f1" : undefined, color: filledCount > 0 ? "#000" : undefined }}
        >
          {filledCount > 0 ? `決定（${filledCount}冊）` : "URLを入力してください"}
        </button>
      </main>
    );
  }

  // ===== STEP: 書籍確認 =====
  if (step === "confirm") {
    return (
      <main className="min-h-screen bg-white px-5 pt-10 pb-10 max-w-lg mx-auto">
        <h1 className="text-2xl font-black text-black text-center mb-1">
          私が推し続ける6書籍
        </h1>
        <p className="text-center text-sm font-bold text-black mb-1">
          表紙画像はこれでOK？
        </p>
        <p className="text-center text-xs text-gray-500 mb-6">
          変更したい場合はタップして変更してね
        </p>

        <div className="flex flex-col gap-5">
          {Array.from({ length: 6 }).map((_, i) => {
            const book = books[i];
            if (!book) return null;
            return (
              <div key={i} className="flex gap-4 items-start bg-gray-50 rounded-2xl p-3">
                {/* 表紙 */}
                <label className="relative w-24 h-32 flex-shrink-0 cursor-pointer group">
                  <div className="w-full h-full bg-gray-200 rounded-xl overflow-hidden relative border border-gray-300">
                    {book.image ? (
                      <Image
                        src={book.image}
                        alt={book.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">
                        📷
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-1 right-1 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center text-xs shadow">
                    🔄
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && handleImageFile(i, e.target.files[0])
                    }
                  />
                </label>

                {/* テキスト */}
                <div className="flex-1 flex flex-col gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">タイトル</p>
                    <input
                      value={book.title}
                      onChange={(e) => handleTitleEdit(i, e.target.value)}
                      className="w-full text-sm font-bold text-black bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#e2a9f1]"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">著者名</p>
                    <input
                      value={book.author}
                      onChange={(e) => handleAuthorEdit(i, e.target.value)}
                      className="w-full text-sm text-black bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#e2a9f1]"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setStep("name")}
          className="mt-8 w-full h-14 rounded-2xl text-base font-bold border-2 border-black"
          style={{ backgroundColor: "#e2a9f1" }}
        >
          次へ
        </button>
        <button
          onClick={() => setStep("url")}
          className="mt-3 w-full text-center text-sm text-gray-500 py-2"
        >
          ← 戻る
        </button>
      </main>
    );
  }

  // ===== STEP: 名前入力 =====
  if (step === "name") {
    const preview = userName.trim() || "　";
    return (
      <main className="min-h-screen bg-white px-5 pt-16 pb-10 max-w-lg mx-auto flex flex-col">
        <h1 className="text-2xl font-black text-black text-center mb-12">
          {preview}が推し続ける6書籍
        </h1>

        <div className="flex-1 flex flex-col justify-center">
          <p className="text-sm text-gray-600 text-center mb-3">
            表示名を入力してね
          </p>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="おなまえ"
            maxLength={20}
            className="w-full h-14 px-4 bg-white text-black text-base text-center border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-[#e2a9f1] placeholder-gray-300"
          />
        </div>

        <button
          onClick={handleComplete}
          disabled={saving}
          className="mt-8 w-full h-14 rounded-2xl text-base font-bold border-2 border-black disabled:opacity-50"
          style={{ backgroundColor: "#e2a9f1" }}
        >
          {saving ? "保存中..." : "次へ"}
        </button>
        <button
          onClick={() => setStep("confirm")}
          className="mt-3 w-full text-center text-sm text-gray-500 py-2"
        >
          ← 戻る
        </button>
      </main>
    );
  }

  // ===== STEP: シェア =====
  const displayName = userName.trim() || "あなた";
  return (
    <main className="min-h-screen bg-white px-5 pt-6 pb-10 max-w-lg mx-auto">
      <p className="text-center text-xs text-gray-400 mb-4">
        長押しして画像を保存
      </p>

      {/* カードプレビュー */}
      <div
        className="w-full rounded-2xl overflow-hidden mb-6"
        style={{ backgroundColor: "#e2a9f1" }}
      >
        <div className="relative w-full" style={{ paddingBottom: "100%" }}>
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{
              width: "600px",
              transform: `scale(${
                typeof window !== "undefined"
                  ? (Math.min(window.innerWidth, 560) - 40) / 600
                  : 0.5
              })`,
            }}
          >
            <ShareCard userName={displayName} books={books} />
          </div>
        </div>
      </div>

      {/* 非表示の実サイズカード（html2canvas用） */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <ShareCard userName={displayName} books={books} />
      </div>

      <p className="text-center text-sm font-bold text-black mb-5">
        {displayName}のおすすめをみんなにシェアしよう！
      </p>

      {/* シェアリンクコピー */}
      <div className="flex gap-2 mb-3">
        <input
          readOnly
          value={shareUrl}
          className="flex-1 h-12 px-3 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-600 focus:outline-none"
        />
        <button
          onClick={handleCopy}
          className="px-5 h-12 rounded-xl border-2 border-black text-sm font-bold flex-shrink-0 transition-colors"
          style={{ backgroundColor: copied ? "#86efac" : "#e2a9f1" }}
        >
          {copied ? "✓" : "コピー"}
        </button>
      </div>

      <button
        onClick={handleSaveImage}
        className="w-full h-12 rounded-xl border-2 border-gray-300 bg-white text-black text-sm font-medium mb-3 hover:bg-gray-50"
      >
        📥 画像を保存
      </button>

      <button
        onClick={handleXShare}
        className="w-full h-12 rounded-xl border-2 border-black text-black text-sm font-bold mb-3"
        style={{ backgroundColor: "#e2a9f1" }}
      >
        𝕏 Xでシェア
      </button>

      <button
        onClick={() => shareId && router.push(`/${shareId}`)}
        className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 text-sm mb-6"
      >
        シェアページを確認する →
      </button>

      <button
        onClick={() => setStep("name")}
        className="w-full text-center text-sm text-gray-500 py-2"
      >
        ← 戻る
      </button>

      <button
        onClick={() => {
          setStep("url");
          setShareId(null);
          setShareUrl("");
          setBooks(Array(6).fill(null));
          setUrls(Array(6).fill(""));
          setUserName("");
        }}
        className="w-full text-center text-sm text-gray-400 py-2"
      >
        ← 最初から作り直す
      </button>
    </main>
  );
}
