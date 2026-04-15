"use client";

export default function BackButton({ shareId }: { shareId: string }) {
  return (
    <a
      href={`/?share=${shareId}`}
      className="block w-full text-center text-sm text-black py-2"
    >
      ← 戻る
    </a>
  );
}
