import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "my6books — 私が推し続ける6書籍",
  description:
    "あなたの人生を変えた6冊を選んで、ビジュアルカードをシェアしよう",
  openGraph: {
    title: "my6books — 私が推し続ける6書籍",
    description:
      "あなたの人生を変えた6冊を選んで、ビジュアルカードをシェアしよう",
    siteName: "my6books",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "my6books — 私が推し続ける6書籍",
    description:
      "あなたの人生を変えた6冊を選んで、ビジュアルカードをシェアしよう",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8] antialiased">
        {children}
      </body>
    </html>
  );
}
