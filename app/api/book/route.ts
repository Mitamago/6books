import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import type { BookInfo } from "@/lib/fetchBook";

// ASINをURLから抽出
function extractAsin(url: string): string | null {
  const patterns = [
    /amazon\.co\.jp\/dp\/([A-Z0-9]{10})/,
    /amazon\.co\.jp\/gp\/product\/([A-Z0-9]{10})/,
    /amazon\.com\/dp\/([A-Z0-9]{10})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// amzn.to 短縮URLをフォローしてリダイレクト先URLを取得
async function resolveUrl(url: string): Promise<string> {
  if (!url.includes("amzn.to") && !url.includes("amzn.asia")) {
    return url;
  }
  const response = await fetch(url, {
    method: "HEAD",
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });
  return response.url;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ message: "URLが必要です" }, { status: 400 });
    }

    // 短縮URLを解決
    const resolvedUrl = await resolveUrl(url.trim());

    // ASIN抽出
    const asin = extractAsin(resolvedUrl);
    if (!asin) {
      return NextResponse.json(
        { message: "AmazonのURLからASINを取得できませんでした" },
        { status: 400 }
      );
    }

    const amazonUrl = `https://www.amazon.co.jp/dp/${asin}`;

    // スクレイピング
    const response = await fetch(amazonUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Amazon取得失敗: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // タイトル取得
    let title =
      $("meta[property='og:title']").attr("content") ||
      $("#productTitle").text().trim() ||
      $("h1.a-size-large").text().trim();

    // 著者取得
    const author =
      $(".author .contributorNameID").first().text().trim() ||
      $(".author a.contributorNameID").first().text().trim() ||
      $("span.author a").first().text().trim() ||
      $('[data-feature-name="bylineInfo"] .author a').first().text().trim() ||
      $(".bylineInfo .author a").first().text().trim();

    // 画像取得
    const image =
      $("meta[property='og:image']").attr("content") ||
      $("#imgBlkFront").attr("src") ||
      $("#landingImage").attr("src") ||
      $("img#ebooksImgBlkFront").attr("src") ||
      "";

    // タイトルのクリーンアップ（Amazonのサフィックスを削除）
    if (title) {
      title = title
        .replace(/\s*[\|:]\s*Amazon\.co\.jp.*$/, "")
        .replace(/\s*- Amazon.*$/, "")
        .trim();
    }

    if (!title) {
      return NextResponse.json(
        { message: "書籍情報を取得できませんでした。URLを確認してください" },
        { status: 422 }
      );
    }

    const bookInfo: BookInfo = {
      asin,
      title,
      author: author || "著者不明",
      image,
      url: amazonUrl,
    };

    return NextResponse.json(bookInfo);
  } catch (err) {
    console.error("Book fetch error:", err);
    return NextResponse.json(
      { message: "書籍情報の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
