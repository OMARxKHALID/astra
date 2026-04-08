import dns from "dns/promises";
import net from "net";

export function isPrivateIP(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    return (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      parts[0] === 0
    );
  }
  if (net.isIPv6(ip)) {
    const loc = ip.toLowerCase();
    return (
      loc === "::1" ||
      loc === "::" ||
      /^f[cd][0-9a-f]{2}:/i.test(loc) || // Unique Local Address
      /^fe[89ab][0-9a-f]:/i.test(loc) // Link Local
    );
  }
  return true; // Treat unknown/invalid formats as private for safety
}

export async function isValidUrl(
  urlStr,
  allowedProtocols = ["https:", "http:"],
) {
  try {
    const url = new URL(urlStr);

    // 1. Check Protocol
    if (!allowedProtocols.includes(url.protocol)) return false;

    // 2. Check if Hostname is a raw IP
    const hostname = url.hostname;
    if (net.isIP(hostname)) {
      return !isPrivateIP(hostname);
    }

    // 3. Resolve DNS to check for Rebinding/Private IPs
    // We resolve ALL addresses to ensure none point to internal resources
    const addresses = await dns.lookup(hostname, { all: true });
    for (const record of addresses) {
      if (isPrivateIP(record.address)) return false;
    }

    return true;
  } catch {
    return false;
  }
}
