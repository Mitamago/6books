"use client";

import type { BookInfo } from "@/lib/fetchBook";

interface ShareCardProps {
  userName: string;
  books: (BookInfo | null)[];
}

// このコンポーネントは html2canvas でキャプチャされる
// id="share-card" を持つ要素が対象
export default function ShareCard({ userName, books }: ShareCardProps) {
  const displayName = userName.trim() || "あなた";

  return (
    <div
      id="share-card"
      style={{
        width: "1200px",
        height: "630px",
        backgroundColor: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px",
        fontFamily: "'Noto Serif JP', serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 背景装飾 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 60%)",
        }}
      />

      {/* タイトル */}
      <h1
        style={{
          color: "#f5f0e8",
          fontSize: "32px",
          fontWeight: "400",
          letterSpacing: "0.08em",
          marginBottom: "40px",
          textAlign: "center",
          position: "relative",
        }}
      >
        {displayName}が推し続ける6書籍
      </h1>

      {/* 書籍グリッド */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
          width: "100%",
          position: "relative",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => {
          const book = books[i];
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              {/* 表紙 */}
              <div
                style={{
                  width: "120px",
                  height: "170px",
                  backgroundColor: "#1a1a1a",
                  borderRadius: "4px",
                  overflow: "hidden",
                  flexShrink: 0,
                  position: "relative",
                  border: "1px solid #2a2a2a",
                }}
              >
                {book?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.image}
                    alt={book.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#3a3a3a",
                      fontSize: "28px",
                    }}
                  >
                    {i + 1}
                  </div>
                )}
              </div>

              {/* テキスト */}
              <div style={{ textAlign: "center", width: "100%" }}>
                <p
                  style={{
                    color: "#e8e3d8",
                    fontSize: "12px",
                    lineHeight: "1.5",
                    margin: "0 0 4px",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                  }}
                >
                  {book?.title || ""}
                </p>
                <p
                  style={{
                    color: "#6b6b6b",
                    fontSize: "11px",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {book?.author || ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* フッター */}
      <p
        style={{
          color: "#3a3a3a",
          fontSize: "13px",
          letterSpacing: "0.2em",
          marginTop: "32px",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        my6books.jp
      </p>
    </div>
  );
}
