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

    // Fetch the target website with the matching device User-Agent, following redirects
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": userAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua-Mobile": isMobile ? "?1" : "?0",
      },
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      return new NextResponse(
        `<html><body style='font-family:sans-serif;padding:40px;text-align:center;color:#ef4444;'><h3>Failed to load website preview (${response.status})</h3><p>${targetUrl}</p></body></html>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const finalUrl = response.url || targetUrl;
    let resolvedOrigin = origin;
    try {
      resolvedOrigin = new URL(finalUrl).origin;
    } catch (_) {}

    let html = await response.text();

    // Strip restrictive security headers & subresource integrity (SRI)
    html = html.replace(/<meta[^>]*http-equiv=["']?(content-security-policy|x-frame-options)["']?[^>]*>/gi, "");
    html = html.replace(/\s+integrity=["'][^"']+["']/gi, "");

    // Neutralize frame-busting scripts in HTML
    html = html.replace(/\b(window\.)?top\.location(\.href)?\s*=/gi, "void 0; //");
    html = html.replace(/\bparent\.location(\.href)?\s*=/gi, "void 0; //");

    // Prepare injection script:
    // 1. <base> tag pointing to final resolved origin so all assets load correctly
    // 2. Frame-busting protection shim
    // 3. Viewport meta to enforce mobile device scale when isMobile
    // 4. Co-browsing sync script to receive SCROLL, MENU, CART, and CLICK commands
    // 5. Universal popup & cookie consent suppression CSS
    const injection = `
      <base href="${resolvedOrigin}/">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script>
        try {
          if (window.top !== window.self) {
            window.top = window.self;
          }
        } catch(e) {}
      </script>
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
          var customerCart = null;

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

          // Universal Menu Drawer Synchronizer (Shopify Dawn, WooCommerce, WordPress, Bootstrap, Tailwind, Custom)
          function toggleMenuDrawer(shouldOpen) {
            try {
              var details = document.querySelector('#Details-menu-drawer-container, details.menu-drawer-container, header-drawer details, details[class*="menu"], details[id*="menu"]');
              var drawer = document.querySelector('.menu-drawer, nav[class*="drawer"], [class*="mobile-nav"], [class*="menu-drawer"], #mobile-menu, .mobile-menu, [class*="offcanvas"], [class*="off-canvas"], .ast-mobile-menu-buttons, .woodmart-navigation, .mobile-nav-wrapper');
              var summary = details ? details.querySelector('summary') : document.querySelector('summary.header__icon--menu, [aria-label*="menu" i], button[aria-label*="menu" i], .hamburger, .menu-toggle, .nav-toggle, [data-drawer-trigger]');

              var openState = shouldOpen !== undefined ? shouldOpen : (details ? !details.hasAttribute('open') : true);

              if (details) {
                if (openState) {
                  details.setAttribute('open', '');
                  details.classList.add('menu-open');
                } else {
                  details.removeAttribute('open');
                  details.classList.remove('menu-open');
                }
              }

              if (summary) {
                summary.setAttribute('aria-expanded', openState ? 'true' : 'false');
                summary.classList.toggle('is-active', openState);
                summary.classList.toggle('active', openState);
              }

              if (drawer) {
                if (openState) {
                  drawer.style.transform = 'none';
                  drawer.style.visibility = 'visible';
                  drawer.style.opacity = '1';
                  drawer.style.display = 'block';
                  drawer.classList.add('menu-open', 'is-active', 'active', 'show', 'open');
                } else {
                  drawer.style.transform = '';
                  drawer.style.visibility = '';
                  drawer.style.opacity = '';
                  drawer.style.display = '';
                  drawer.classList.remove('menu-open', 'is-active', 'active', 'show', 'open');
                }
              }

              // Also toggle standard classes on body, html & header
              var bodyClasses = ['menu-open', 'nav-open', 'is-menu-open', 'drawer-open', 'offcanvas-open', 'mobile-menu-active', 'show-menu'];
              bodyClasses.forEach(function(cls) {
                document.body.classList.toggle(cls, openState);
                if (document.documentElement) document.documentElement.classList.toggle(cls, openState);
              });

              var header = document.querySelector('header, .header, #header-component, .site-header, nav');
              if (header) {
                header.classList.toggle('menu-open', openState);
                header.classList.toggle('nav-open', openState);
              }
            } catch(e) {}
          }

          // Universal Cart Synchronizer (Shopify, WooCommerce, Magento, BigCommerce, Custom)
          function syncCartData(cart) {
            if (!cart) return;
            customerCart = cart;
            window.__WHATIN_CUSTOMER_CART = cart;
            var count = typeof cart.item_count === 'number' ? cart.item_count : (cart.items ? cart.items.length : 0);

            // 1. Update all cart count bubbles in header across all platforms
            var countEls = document.querySelectorAll(
              '.cart-bubble__text-count, [ref="cartBubbleCount"], [data-testid="cart-bubble"], .cart-count-bubble span, [data-cart-count], .header-actions__cart-icon span, .cart-count, .cart-items-count, .cart-quantity, .cart__count, .count, .header__cart-count, .badge-cart, .cart-badge, [data-cart-item-count], .wc-cart-count, .cart-contents-count, .shopping-cart-badge, .header-cart-count, [data-cart-items]'
            );
            countEls.forEach(function(el) {
              el.innerText = String(count);
              el.classList.remove('hidden', 'visually-hidden');
              el.style.display = count > 0 ? 'inline-block' : 'none';
              if (el.parentElement) {
                el.parentElement.classList.remove('hidden', 'visually-hidden');
              }
            });

            var bubbleWrappers = document.querySelectorAll('.cart-bubble, [ref="cartBubble"], .cart-count-bubble, .header-actions__cart-icon, .cart-contents, .badge, [data-cart-count]');
            bubbleWrappers.forEach(function(bw) {
              bw.classList.remove('visually-hidden', 'hidden');
              if (count > 0 && bw.style.display === 'none') {
                bw.style.display = 'flex';
              }
            });

            // 2. If on /cart page or cart section, render the real customer items if empty
            if (window.location.pathname.indexOf('/cart') !== -1 && count > 0 && cart.items && cart.items.length > 0) {
              var emptyBox = document.querySelector('.cart-items__empty, .cart-empty, [class*="empty-button"], .woocommerce-info, .cart-empty-message');
              var itemsWrapper = document.querySelector('.cart-items__wrapper, .cart-items-component, form[action*="/cart"], .cart-table, .woocommerce-cart-form, main, #main-content');
              if (itemsWrapper && (!itemsWrapper.querySelector('.cobrowse-synced-cart-item'))) {
                if (emptyBox) emptyBox.style.display = 'none';
                var cartHtml = '<div class="cobrowse-synced-cart-item" style="padding:16px;background:#ffffff;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.06);margin-bottom:16px;border:1px solid #e2e8f0;">';
                cartHtml += '<h3 style="font-size:15px;font-weight:700;margin:0 0 12px 0;color:#0f172a;">Active Customer Cart (' + count + ' items)</h3>';
                cart.items.forEach(function(it) {
                  cartHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;">';
                  cartHtml += '<div style="display:flex;align-items:center;gap:10px;">';
                  if (it.image) {
                    cartHtml += '<img src="' + it.image + '" style="width:38px;height:38px;border-radius:6px;object-fit:cover;border:1px solid #e2e8f0;" />';
                  }
                  cartHtml += '<div><div style="font-size:13px;font-weight:600;color:#1e293b;">' + (it.title || 'Product') + '</div>';
                  if (it.variant_title) cartHtml += '<div style="font-size:11px;color:#94a3b8;">' + it.variant_title + '</div>';
                  cartHtml += '<div style="font-size:11.5px;color:#64748b;margin-top:2px;">Qty: ' + (it.quantity || 1) + '</div></div></div>';
                  cartHtml += '<div style="font-size:14px;font-weight:700;color:#059669;">₹' + (it.price || 0) + '</div>';
                  cartHtml += '</div>';
                });
                cartHtml += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:8px;font-size:14px;font-weight:800;color:#0f172a;">';
                cartHtml += '<span>Total:</span><span style="color:#059669;">₹' + (cart.total_price || 0) + ' ' + (cart.currency || 'INR') + '</span>';
                cartHtml += '</div>';
                cartHtml += '</div>';
                itemsWrapper.insertAdjacentHTML('afterbegin', cartHtml);
              }
            }
          }

          // Universal API Mocks for Cart across Shopify & WooCommerce
          try {
            var rawFetch = window.fetch;
            window.fetch = function(url, opts) {
              if (typeof url === 'string' && customerCart) {
                if (url.indexOf('/cart.js') !== -1 || url.indexOf('/cart.json') !== -1) {
                  return Promise.resolve(new Response(JSON.stringify(customerCart), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                  }));
                }
                if (url.indexOf('/wp-json/wc/store/v1/cart') !== -1) {
                  var wcResp = {
                    items_count: customerCart.item_count,
                    totals: { total_price: String((customerCart.total_price || 0) * 100), currency_code: customerCart.currency || 'INR' },
                    items: (customerCart.items || []).map(function(it) {
                      return { name: it.title, quantity: it.quantity, prices: { price: String((it.price || 0) * 100) } };
                    })
                  };
                  return Promise.resolve(new Response(JSON.stringify(wcResp), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                  }));
                }
              }
              return rawFetch.apply(this, arguments);
            };
          } catch(e) {}

          // Centralized Co-Browsing Event Receiver
          window.addEventListener('message', function(event) {
            if (!event.data) return;

            // Scroll synchronization
            if (event.data.type === 'COBROWSE_SCROLL') {
              currentDepth = typeof event.data.depth === 'number' ? event.data.depth : 0;
              applyScroll();
            }

            // Navigation Menu Toggle (Opens/Closes mobile menu drawer in mirror)
            if (event.data.type === 'COBROWSE_TOGGLE_MENU') {
              toggleMenuDrawer(event.data.open);
            }

            // Real-time Cart Synchronization
            if (event.data.type === 'COBROWSE_SYNC_CART') {
              syncCartData(event.data.cart);
            }

            // Element Clicks / Interactions
            if (event.data.type === 'COBROWSE_CLICK') {
              if (event.data.isMenu || /menu|drawer/i.test(event.data.label || '')) {
                toggleMenuDrawer(true);
              } else {
                var sel = event.data.selector;
                var el = sel ? document.querySelector(sel) : null;
                if (!el && typeof event.data.x === 'number' && typeof event.data.y === 'number') {
                  var cx = (event.data.x / 100) * (window.innerWidth || document.documentElement.clientWidth);
                  var cy = (event.data.y / 100) * (window.innerHeight || document.documentElement.clientHeight);
                  el = document.elementFromPoint(cx, cy);
                }
                if (el) {
                  var d = el.closest('details');
                  if (d) { d.open = !d.open; }
                  if (el.tagName === 'INPUT' && (el.type === 'radio' || el.type === 'checkbox')) {
                    el.checked = !el.checked;
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                  try {
                    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                    el.click();
                  } catch(e) {}
                }
              }
            }
          });

          // Re-apply on load and notify parent window
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
        body { -webkit-font-smoothing: antialiased; }

        /* Suppress intrusive overlays, cookie consent & popups in the agent's mirror */
        #onetrust-banner-sdk, #onetrust-consent-sdk, .cookie-banner, #cookie-notice,
        .cc-window, .cc-banner, [class*="cookie-consent"], [id*="cookie-notice"],
        [class*="cookie-notice"], [class*="gdpr"], [id*="gdpr"], .klaviyo-form,
        [data-testid="POPUP"], .popup-modal, .newsletter-popup, #shopify-section-popup,
        .privy-container, [id*="omnisend-form"], .mailchimp-popup {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
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
