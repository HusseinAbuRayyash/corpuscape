import * as cheerio from "cheerio";

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
        "User-Agent": "Mozilla/5.0 (compatible; TransCorpusAI/1.0; Research Tool)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    $("script, style, nav, footer, header, aside, iframe, noscript, [role='navigation'], [role='banner'], .sidebar, .menu, .nav, .footer, .header, .ad, .ads, .advertisement, .cookie, .popup, .modal").remove();

    let title = $("title").first().text().trim();
    if (!title) title = $("h1").first().text().trim();
    if (!title) title = $('meta[property="og:title"]').attr("content")?.trim() || "Untitled";

    let content = "";

    const articleEl = $("article, [role='main'], .article, .post-content, .entry-content, .content, main").first();
    if (articleEl.length) {
      content = extractTextFromElement($, articleEl);
    }

    if (!content || content.length < 100) {
      const paragraphs: string[] = [];
      $("p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 30) {
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
