import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { request } from "undici";
import { URL } from "node:url";
import dns from "node:dns/promises";

// SSRF protection: private IP ranges and magic domains
const PRIVATE_V4 = [
  ["10.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["127.0.0.0", 8],
];
const PRIVATE_V6 = ["fc00::/7", "fe80::/10", "::1/128"];
const BAD_SUFFIX = [".nip.io", ".xip.io", ".sslip.io", ".localtest.me"];

function ipV4ToBytes(ip: string): number[] {
  return ip.split(".").map(n => Number(n));
}

function matchCidrV4(ip: string, base: string, bits: number): boolean {
  const a = ipV4ToBytes(ip);
  const b = ipV4ToBytes(base);
  const bytes = Math.floor(bits / 8);
  const rem = bits % 8;
  
  for (let i = 0; i < bytes; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  if (rem) {
    const mask = 0xff << (8 - rem);
    if ((a[bytes] & mask) !== (b[bytes] & mask)) return false;
  }
  
  return true;
}

function ipInCidrV6(ip: string, cidr: string): boolean {
  // Simple IPv6 CIDR check for known private ranges
  const normalized = ip.toLowerCase();
  if (cidr === "::1/128") return normalized === "::1";
  if (cidr === "fc00::/7") return normalized.startsWith("fc") || normalized.startsWith("fd");
  if (cidr === "fe80::/10") return normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb");
  return false;
}

async function validateExternalUrl(raw: string): Promise<URL> {
  const u = new URL(raw);
  
  if (!/^https?:$/.test(u.protocol)) {
    throw new Error("Only http/https protocols allowed");
  }
  
  if (BAD_SUFFIX.some(s => u.hostname.endsWith(s))) {
    throw new Error("Blocked hostname");
  }
  
  // Resolve IPv4 addresses and check for private ranges
  const v4 = await dns.resolve4(u.hostname).catch(() => []);
  for (const ip of v4 as string[]) {
    for (const [base, bits] of PRIVATE_V4) {
      if (matchCidrV4(ip, base, bits)) {
        throw new Error("Private IPv4 blocked");
      }
    }
  }
  
  // Resolve IPv6 addresses and check for private ranges
  const v6 = await dns.resolve6(u.hostname).catch(() => []);
  for (const ip of v6 as string[]) {
    for (const cidr of PRIVATE_V6) {
      if (ipInCidrV6(ip, cidr)) {
        throw new Error("Private IPv6 blocked");
      }
    }
  }
  
  return u;
}

async function fetchNoAutoRedirect(u: URL) {
  const res = await request(u.toString(), {
    method: "GET",
    headers: { "user-agent": "ReelRepurposer/1.0 (+fetch)" },
    bodyTimeout: 10_000,
    headersTimeout: 10_000,
  });
  return res;
}

export async function fetchAndExtract(url: string): Promise<{
  ok: boolean;
  content?: string;
  title?: string;
  reason?: string;
}> {
  try {
    let current = await validateExternalUrl(url);
    
    // Follow up to 5 redirects manually (validating each hop)
    for (let hop = 0; hop < 5; hop++) {
      const res = await fetchNoAutoRedirect(current);
      const loc = res.headers.location;
      
      if (res.statusCode >= 300 && res.statusCode < 400 && loc) {
        const next = new URL(loc, current);
        current = await validateExternalUrl(next.toString());
        continue;
      }
      
      const ctype = String(res.headers["content-type"] || "");
      if (!ctype.includes("text/html")) {
        return { ok: false, reason: "not-html" };
      }
      
      const html = await res.body.text();
      if (html.length < 1000) {
        return { ok: false, reason: "too-short" };
      }
      
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      
      if (!article?.textContent || article.textContent.length < 500) {
        return { ok: false, reason: "readability-failed" };
      }
      
      return {
        ok: true,
        title: article.title || undefined,
        content: article.textContent
      };
    }
    
    return { ok: false, reason: "too-many-redirects" };
  } catch (e: any) {
    return { ok: false, reason: e.message || "fetch-failed" };
  }
}
