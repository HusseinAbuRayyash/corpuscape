import * as cheerio from "cheerio";
import { GoogleGenAI } from "@google/genai";

export interface ScrapedArticle {
  url: string;
  title: string;
  content: string;
  wordCount: number;
  scrapedAt: string;
}

function isAllowedUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "[::1]") return false;
    if (host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("172.")) return false;
    if (host.endsWith(".local") || host.endsWith(".internal")) return false;
    return true;
  } catch {
    return false;
  }
}

function extractFromNextData(html: string): { title: string; content: string } | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;

  try {
    const data = JSON.parse(match[1]);
    let title = "";
    let content = "";

    function findContent(obj: any, depth: number = 0): void {
      if (!obj || typeof obj !== "object" || depth > 8) return;
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === "string" && val.length > 50) {
          const lk = key.toLowerCase();
          if (lk === "content" || lk === "body" || lk === "text" || lk === "article_body" || lk === "articleBody") {
            if (val.length > content.length) {
              content = val;
            }
          }
          if ((lk === "title" || lk === "headline") && val.length > title.length && val.length < 500) {
            title = val;
          }
        }
        if (typeof val === "object") {
          findContent(val, depth + 1);
        }
      }
    }

    findContent(data);

    if (content) {
      content = content.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
      return { title, content };
    }
  } catch {}

  return null;
}

function extractFromJsonLd(html: string): { title: string; content: string } | null {
  const regex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item.articleBody || item.text) {
          const content = (item.articleBody || item.text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          const title = item.headline || item.name || "";
          if (content.length > 50) return { title, content };
        }
      }
    } catch {}
  }
  return null;
}

export async function scrapeUrl(url: string): Promise<ScrapedArticle> {
  if (!isAllowedUrl(url)) {
    throw new Error("URL not allowed: only public HTTP/HTTPS URLs are supported");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    let title = $("title").first().text().trim();
    if (!title) title = $("h1").first().text().trim();
    if (!title) title = $('meta[property="og:title"]').attr("content")?.trim() || "Untitled";

    let content = "";

    const nextData = extractFromNextData(html);
    if (nextData && nextData.content.length > 50) {
      content = nextData.content;
      if (nextData.title) title = nextData.title;
      console.log(`[Scraper] Extracted ${content.length} chars from __NEXT_DATA__ for ${url}`);
    }

    if (!content || content.length < 50) {
      const jsonLd = extractFromJsonLd(html);
      if (jsonLd && jsonLd.content.length > 50) {
        content = jsonLd.content;
        if (jsonLd.title) title = jsonLd.title;
        console.log(`[Scraper] Extracted ${content.length} chars from JSON-LD for ${url}`);
      }
    }

    if (!content || content.length < 50) {
      $("script, style, nav, footer, header, aside, iframe, noscript, [role='navigation'], [role='banner'], .sidebar, .menu, .nav, .footer, .header, .ad, .ads, .advertisement, .cookie, .popup, .modal").remove();

      const articleEl = $("article, [role='main'], .article, .post-content, .entry-content, .content, main").first();
      if (articleEl.length) {
        content = extractTextFromElement($, articleEl);
      }

      if (!content || content.length < 100) {
        const paragraphs: string[] = [];
        $("p").each((_, el) => {
          const text = $(el).text().trim();
          if (text.length > 20) {
            paragraphs.push(text);
          }
        });
        if (paragraphs.length > 0) {
          content = paragraphs.join("\n\n");
        }
      }

      if (!content || content.length < 50) {
        content = $("body").text().replace(/\s+/g, " ").trim();
      }

      if (content) {
        console.log(`[Scraper] Extracted ${content.length} chars from HTML for ${url}`);
      }
    }

    if (!content || content.length < 30) {
      console.log(`[Scraper] HTML extraction failed, trying Gemini for ${url}`);
      content = await extractWithGemini(url, html);
      if (content) {
        console.log(`[Scraper] Gemini extracted ${content.length} chars for ${url}`);
      }
    }

    content = cleanScrapedText(content);
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;

    return {
      url,
      title: title.slice(0, 300),
      content,
      wordCount,
      scrapedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function extractWithGemini(url: string, html: string): Promise<string> {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });

    const htmlSnippet = html.slice(0, 30000);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Extract the main article text content from this HTML. Return ONLY the article body text, preserving the original language (Arabic, English, etc.). Remove navigation, ads, footers, and metadata. If the HTML contains JSON data (like __NEXT_DATA__), extract the article content from it.\n\nURL: ${url}\n\nHTML:\n${htmlSnippet}`,
    });

    return (response.text || "").trim();
  } catch (err) {
    console.error(`[Scraper] Gemini extraction failed for ${url}:`, err);
    return "";
  }
}

function extractTextFromElement($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): string {
  const blocks: string[] = [];
  el.find("h1, h2, h3, h4, h5, h6, p, li, blockquote, td, th, dd, dt, figcaption").each((_, child) => {
    const text = $(child).text().trim();
    if (text.length > 10) {
      const tag = (child as any).tagName || "";
      if (tag.match(/^h[1-6]$/)) {
        blocks.push(`\n## ${text}\n`);
      } else {
        blocks.push(text);
      }
    }
  });
  return blocks.join("\n\n");
}

function cleanScrapedText(text: string): string {
  return text
    .replace(/\t/g, " ")
    .replace(/ {3,}/g, "  ")
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/^\s+$/gm, "")
    .trim();
}

export async function scrapeMultipleUrls(urls: string[]): Promise<ScrapedArticle[]> {
  const results: ScrapedArticle[] = [];
  for (const url of urls.slice(0, 10)) {
    try {
      const article = await scrapeUrl(url.trim());
      results.push(article);
    } catch (error: any) {
      results.push({
        url,
        title: "Error",
        content: `Failed to scrape: ${error.message}`,
        wordCount: 0,
        scrapedAt: new Date().toISOString(),
      });
    }
  }
  return results;
}
