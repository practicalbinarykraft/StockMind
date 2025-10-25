import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { request } from "undici";
import { URL } from "node:url";
import dns from "node:dns/promises";
import net from "node:net";

// SSRF protection: private IP ranges and magic domains
const PRIVATE_V4 = [
  ["0.0.0.0", 8],          // "This network"
  ["10.0.0.0", 8],         // RFC1918 private
  ["100.64.0.0", 10],      // CGN (Carrier-Grade NAT)
  ["127.0.0.0", 8],        // Loopback
  ["169.254.0.0", 16],     // CRITICAL: Link-local (AWS/GCP metadata!)
  ["172.16.0.0", 12],      // RFC1918 private
  ["192.0.0.0", 24],       // IETF Protocol Assignments
  ["192.0.2.0", 24],       // TEST-NET-1
  ["192.168.0.0", 16],     // RFC1918 private
  ["198.18.0.0", 15],      // Benchmarking
  ["198.51.100.0", 24],    // TEST-NET-2
  ["203.0.113.0", 24],     // TEST-NET-3
  ["224.0.0.0", 4],        // Multicast
  ["240.0.0.0", 4],        // Reserved
  ["255.255.255.255", 32], // Broadcast
];
const PRIVATE_V6 = [
  "::1/128",       // Loopback
  "::/128",        // Unspecified
  "::ffff:0:0/96", // IPv4-mapped IPv6 (CRITICAL for SSRF prevention)
  "100::/64",      // Discard prefix
  "2001::/23",     // IETF Protocol Assignments
  "2001:db8::/32", // Documentation
  "2002::/16",     // 6to4 (can tunnel to private IPv4)
  "fc00::/7",      // ULA (Unique Local Addresses)
  "fe80::/10",     // Link-local
  "ff00::/8",      // Multicast
];
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

// Expand IPv6 address to full form for reliable CIDR matching
// Converts "2001::1" → "2001:0000:0000:0000:0000:0000:0000:0001"
// CRITICAL: Handles IPv4-mapped notation "::ffff:192.0.2.1" → "0000:0000:0000:0000:0000:ffff:c000:0201"
function expandIPv6(ip: string): string {
  let normalized = ip.toLowerCase();
  
  // Handle IPv4-mapped IPv6 (e.g., "::ffff:127.0.0.1" or "::ffff:192.0.2.1")
  const ipv4MappedMatch = normalized.match(/^([:a-f0-9]*):([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)$/);
  if (ipv4MappedMatch) {
    const [, prefix, ipv4] = ipv4MappedMatch;
    // Convert IPv4 dotted-quad to two hex hextets
    const octets = ipv4.split('.').map(n => parseInt(n, 10));
    const hex1 = ((octets[0] << 8) | octets[1]).toString(16).padStart(4, '0');
    const hex2 = ((octets[2] << 8) | octets[3]).toString(16).padStart(4, '0');
    normalized = `${prefix}:${hex1}:${hex2}`;
  }
  
  const parts = normalized.split(':');
  
  // Handle compressed :: notation
  if (normalized.includes('::')) {
    const [left, right] = normalized.split('::');
    const leftParts = left ? left.split(':') : [];
    const rightParts = right ? right.split(':') : [];
    const missing = 8 - leftParts.length - rightParts.length;
    
    const expanded = [
      ...leftParts.map(p => p.padStart(4, '0')),
      ...Array(missing).fill('0000'),
      ...rightParts.map(p => p.padStart(4, '0'))
    ];
    
    return expanded.join(':');
  }
  
  // No compression, just pad each part
  return parts.map(p => p.padStart(4, '0')).join(':');
}

// Convert expanded IPv6 to BigInt for CIDR math
function ipv6ToBigInt(expanded: string): bigint {
  const parts = expanded.split(':');
  let result = 0n;
  for (const part of parts) {
    result = (result << 16n) | BigInt(parseInt(part, 16));
  }
  return result;
}

function ipInCidrV6(ip: string, cidr: string): boolean {
  const expanded = expandIPv6(ip);
  const ipBigInt = ipv6ToBigInt(expanded);
  
  // Define CIDR ranges using BigInt for precise matching
  const ranges: { [key: string]: { base: bigint, mask: bigint } } = {
    "::1/128": { 
      base: 1n, 
      mask: ~0n 
    },
    "::/128": { 
      base: 0n, 
      mask: ~0n 
    },
    "::ffff:0:0/96": { 
      base: (0xffffn << 32n), 
      mask: ~((1n << 32n) - 1n) 
    },
    "100::/64": { 
      base: (0x100n << 112n), 
      mask: ~((1n << 64n) - 1n) 
    },
    "2001::/23": { 
      base: (0x2001n << 112n), 
      mask: ~((1n << 105n) - 1n)  // /23 = 128-23 = 105 host bits
    },
    "2001:db8::/32": { 
      base: ((0x2001n << 112n) | (0xdb8n << 96n)), 
      mask: ~((1n << 96n) - 1n) 
    },
    "2002::/16": { 
      base: (0x2002n << 112n), 
      mask: ~((1n << 112n) - 1n) 
    },
    "fc00::/7": { 
      base: (0xfcn << 120n), 
      mask: ~((1n << 121n) - 1n) 
    },
    "fe80::/10": { 
      base: (0xfe80n << 112n), 
      mask: ~((1n << 118n) - 1n) 
    },
    "ff00::/8": { 
      base: (0xffn << 120n), 
      mask: ~((1n << 120n) - 1n) 
    }
  };
  
  const range = ranges[cidr];
  if (!range) return false;
  
  return (ipBigInt & range.mask) === (range.base & range.mask);
}

// CRITICAL: Check if a hostname is a literal IP (v4 or v6) in a private range
// This prevents SSRF via literal IPs like http://127.0.0.1 or http://[::1]
function isPrivateLiteralIp(hostname: string): boolean {
  // Remove brackets from IPv6 literals like [::1]
  const clean = hostname.replace(/^\[|\]$/g, "");
  
  // Check if it's a valid IP
  const ipv4 = net.isIPv4(clean);
  const ipv6 = net.isIPv6(clean);
  
  if (!ipv4 && !ipv6) return false; // Not a literal IP, safe to proceed with DNS
  
  if (ipv4) {
    // Check against all private IPv4 ranges
    for (const [base, bits] of PRIVATE_V4) {
      if (matchCidrV4(clean, base, bits)) {
        return true; // Private IPv4 detected
      }
    }
  }
  
  if (ipv6) {
    // Check against all private IPv6 ranges
    for (const cidr of PRIVATE_V6) {
      if (ipInCidrV6(clean, cidr)) {
        return true; // Private IPv6 detected
      }
    }
  }
  
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
  
  // CRITICAL: Block literal private IPs BEFORE DNS resolution
  // This prevents SSRF via http://127.0.0.1, http://[::1], http://[::ffff:127.0.0.1]
  if (isPrivateLiteralIp(u.hostname)) {
    throw new Error("Private IP address blocked");
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
