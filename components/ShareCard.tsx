"use client";

import type { BookInfo } from "@/lib/fetchBook";

interface ShareCardProps {
  userName: string;
  books: (BookInfo | null)[];
}

export default function ShareCard({ userName, books }: ShareCardProps) {
  const displayName = userName.trim() || "あなた";

  return (
    <div
      id="share-card"
      style={{
        width: "600px",
        backgroundColor: "#e2a9f1",
        padding: "36px 28px",
        fontFamily: "'Noto Sans JP', sans-serif",
      }}
    >
      <h1
        style={{
          color: "#1a1a1a",
          fontSize: "22px",
          fontWeight: "900",
          textAlign: "center",
          marginBottom: "28px",
        }}
      >
        {displayName}が推し続ける6書籍
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
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
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "110px",
                  height: "150px",
                  backgroundColor: "rgba(255,255,255,0.5)",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "2px solid rgba(255,255,255,0.8)",
                }}
              >
                {book?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.image}
                    alt={book.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "28px",
                    }}
                  >
                    {i + 1}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center", width: "110px" }}>
                <p
                  style={{
                    color: "#1a1a1a",
                    fontSize: "11px",
                    fontWeight: "700",
                    lineHeight: "1.4",
                    margin: "0 0 3px",
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
                    color: "#555",
                    fontSize: "10px",
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

      <p
        style={{
          textAlign: "center",
          color: "rgba(0,0,0,0.35)",
          fontSize: "11px",
          marginTop: "24px",
          letterSpacing: "0.15em",
        }}
      >
        my6books.jp
      </p>
    </div>
  );
}
