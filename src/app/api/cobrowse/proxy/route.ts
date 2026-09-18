import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl || !targetUrl.startsWith("http")) {
      return new NextResponse(
        "<html><body style='font-family:sans-serif;padding:40px;text-align:center;color:#64748b;'><h3>Invalid URL for Live Co-Browsing</h3></body></html>",
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const urlObj = new URL(targetUrl);
    const origin = urlObj.origin;
    const deviceParam = searchParams.get("device") || "desktop";
    const isMobile = deviceParam.toLowerCase() === "mobile";

    const userAgent = isMobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    // Fetch the target website with the matching device User-Agent
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": userAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua-Mobile": isMobile ? "?1" : "?0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return new NextResponse(
        `<html><body style='font-family:sans-serif;padding:40px;text-align:center;color:#ef4444;'><h3>Failed to load website preview (${response.status})</h3><p>${targetUrl}</p></body></html>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    let html = await response.text();

    // Strip any meta tags that enforce CSP or frame restrictions
    html = html.replace(/<meta[^>]*http-equiv=["']?(content-security-policy|x-frame-options)["']?[^>]*>/gi, "");

    // Prepare injection script:
    // 1. <base> tag so all assets, CSS, images, and fonts load from target origin
    // 2. Viewport meta to enforce mobile device scale when isMobile
    // 3. Co-browsing sync script to receive SCROLL commands from parent window
    // 4. Disable internal navigation clicks so agent browsing doesn't redirect
    const injection = `
      <base href="${origin}/">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script>
        (function() {
          // Disable clicking links inside the co-browse view
          document.addEventListener('click', function(e) {
            var a = e.target.closest('a, button, [role="button"]');
            if (a && a.tagName === 'A') {
              e.preventDefault();
            }
          }, true);

          var currentDepth = 0;
          function applyScroll() {
            var docEl = document.documentElement;
            var bodyEl = document.body;
            var scrollHeight = Math.max(
              docEl ? docEl.scrollHeight : 0,
              bodyEl ? bodyEl.scrollHeight : 0
            );
            var clientHeight = window.innerHeight || (docEl ? docEl.clientHeight : 0) || 0;
            var maxScroll = Math.max(0, scrollHeight - clientHeight);
            var targetY = maxScroll * (currentDepth / 100);

            window.scrollTo({
              top: targetY,
              behavior: 'smooth'
            });
          }

          // Scroll synchronization listener
          window.addEventListener('message', function(event) {
            if (!event.data) return;
            if (event.data.type === 'COBROWSE_SCROLL') {
              currentDepth = typeof event.data.depth === 'number' ? event.data.depth : 0;
              applyScroll();
            }
          });

          // Re-apply scroll on load and notify parent window
          window.addEventListener('load', function() {
            applyScroll();
            if (window.parent) {
              window.parent.postMessage({ type: 'COBROWSE_IFRAME_READY' }, '*');
            }
          });

          // Keep scroll synced if images or lazy-loaded blocks resize the page
          if (typeof ResizeObserver !== 'undefined') {
            try {
              var ro = new ResizeObserver(function() {
                if (currentDepth > 0) {
                  applyScroll();
                }
              });
              if (document.body) ro.observe(document.body);
              if (document.documentElement) ro.observe(document.documentElement);
            } catch (err) {}
          }
        })();
      </script>
      <style>
        /* Smooth scrolling */
        html { scroll-behavior: smooth !important; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.25); border-radius: 4px; }
      </style>
    `;

    // Inject right after <head> or at the beginning of <html>
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (match) => `${match}\n${injection}`);
    } else {
      html = `${injection}\n${html}`;
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Crucial: Bypass X-Frame-Options & allow iframe embedding from our app
        "X-Frame-Options": "ALLOWALL",
        "Content-Security-Policy": "frame-ancestors *",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err: any) {
    return new NextResponse(
      `<html><body style='font-family:sans-serif;padding:40px;text-align:center;color:#ef4444;'><h3>Co-Browsing Proxy Error</h3><p>${err.message}</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
