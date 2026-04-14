import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import type { BookInfo } from "@/lib/fetchBook";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "ja-JP,ja;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

// URLとHTMLからASINを抽出（複数パターン対応）
function extractAsin(urlOrHtml: string): string | null {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/,
    /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/,
    /asin=([A-Z0-9]{10})/,
    /"asin"\s*:\s*"([A-Z0-9]{10})"/,
    /data-asin="([A-Z0-9]{10})"/,
  ];
  for (const pattern of patterns) {
    const match = urlOrHtml.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// 短縮URLを解決して最終URLとHTMLを返す
async function resolveAndFetch(
  url: string
): Promise<{ finalUrl: string; html: string }> {
  const isShort =
    url.includes("amzn.to") ||
    url.includes("amzn.asia") ||
    url.includes("a.co");

  if (isShort) {
    // 短縮URLの場合：GETでリダイレクト追跡しつつHTMLも取得
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: FETCH_HEADERS,
    });
    const html = await res.text();
    return { finalUrl: res.url, html };
  } else {
    // 通常URLの場合：直接フェッチ
    const res = await fetch(url, { headers: FETCH_HEADERS });
    const html = await res.text();
    return { finalUrl: res.url, html };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ message: "URLが必要です" }, { status: 400 });
    }

    const trimmedUrl = url.trim();

    // URLを解決してHTMLを取得
    const { finalUrl, html } = await resolveAndFetch(trimmedUrl);

    // ASINをURLから試みる
    let asin = extractAsin(finalUrl);

    // URLで取れなかった場合はHTMLから抽出
    if (!asin) {
      asin = extractAsin(html);
    }

    if (!asin) {
      return NextResponse.json(
        {
          message:
            "AmazonのURLからASINを取得できませんでした。Amazon商品ページのURLを入力してください",
        },
        { status: 400 }
      );
    }

    // 正規のAmazon URLでHTML再取得（短縮URLの場合、取得済みHTMLが最終ページでない場合がある）
    let pageHtml = html;
    if (!finalUrl.includes("amazon.co.jp")) {
      const amazonUrl = `https://www.amazon.co.jp/dp/${asin}`;
      const res = await fetch(amazonUrl, { headers: FETCH_HEADERS });
      pageHtml = await res.text();
    }

    const $ = cheerio.load(pageHtml);

    // タイトル取得
    let title =
      $("meta[property='og:title']").attr("content") ||
      $("#productTitle").text().trim() ||
      $("h1#title").text().trim() ||
      $("h1.a-size-large").text().trim();

    // 著者取得
    const author =
      $(".author .contributorNameID").first().text().trim() ||
      $(".author a").first().text().trim() ||
      $("span.author a").first().text().trim() ||
      $('[data-feature-name="bylineInfo"] a').first().text().trim() ||
      "";

    // 画像取得
    const image =
      $("meta[property='og:image']").attr("content") ||
      $("#imgBlkFront").attr("src") ||
      $("#landingImage").attr("src") ||
      $("img#ebooksImgBlkFront").attr("src") ||
      "";

    // タイトルのクリーンアップ
    if (title) {
      title = title
        .replace(/\s*[|:]\s*Amazon\.co\.jp.*$/i, "")
        .replace(/\s*-\s*Amazon.*$/i, "")
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
      url: `https://www.amazon.co.jp/dp/${asin}`,
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
