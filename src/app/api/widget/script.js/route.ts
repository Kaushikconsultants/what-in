import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/widget/script.js
 * Serves the dynamic, zero-dependency embeddable website widget JavaScript.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId") || searchParams.get("tenant") || "";

  let widgetConfig: any = {
    themeColor: "#25D366",
    position: "bottom-right",
    heading: "Chat with us on WhatsApp",
    subheading: "Typically replies in a few minutes",
    welcomeMessage: "Hi! I have an inquiry from your website.",
    avatarUrl: "",
    requireLeadForm: false,
    showOnMobile: true,
    phoneNumber: "917404388242",
  };

  if (clientId) {
    const client = await prisma.whatsAppClient.findUnique({
      where: { id: clientId },
      include: { websiteWidget: true },
    });
    if (client) {
      if (client.phoneNumber) widgetConfig.phoneNumber = client.phoneNumber.replace(/\D/g, "");
      if (client.websiteWidget) {
        widgetConfig = {
          ...widgetConfig,
          themeColor: client.websiteWidget.themeColor || "#25D366",
          position: client.websiteWidget.position || "bottom-right",
          heading: client.websiteWidget.heading || widgetConfig.heading,
          subheading: client.websiteWidget.subheading || widgetConfig.subheading,
          welcomeMessage: client.websiteWidget.welcomeMessage || widgetConfig.welcomeMessage,
          avatarUrl: client.websiteWidget.avatarUrl || "",
          requireLeadForm: Boolean(client.websiteWidget.requireLeadForm),
          showOnMobile: client.websiteWidget.showOnMobile !== false,
        };
      }
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://whatsapp.esponsports.com";

  // Generate lightweight vanilla JS bundle
  const jsCode = `
(function() {
  if (window.__WHATIN_WIDGET_LOADED__) return;
  window.__WHATIN_WIDGET_LOADED__ = true;

  var config = ${JSON.stringify(widgetConfig)};
  var clientId = "${clientId}";
  var appUrl = "${appUrl}";

  var isMobile = window.innerWidth <= 768;
  if (isMobile && !config.showOnMobile) return;

  // Platform & Environment Auto-Detection
  var platform = 'Custom HTML';
  var detectedProduct = null;

  try {
    if (window.Shopify || window.ShopifyAnalytics) {
      platform = 'Shopify';
      if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.product) {
        var sp = window.ShopifyAnalytics.meta.product;
        detectedProduct = {
          title: sp.title || sp.name || '',
          price: sp.price ? (sp.price / 100).toFixed(2) : ''
        };
      } else if (window.location.pathname.indexOf('/products/') !== -1) {
        var shopifyTitleEl = document.querySelector('.product-single__title, .product__title, h1.product-title, h1');
        if (shopifyTitleEl) {
          detectedProduct = {
            title: shopifyTitleEl.innerText.trim(),
            price: ''
          };
        }
      }
    } else if (document.body && (document.body.classList.contains('woocommerce') || document.body.classList.contains('woocommerce-page'))) {
      platform = 'WooCommerce';
      var wooTitleEl = document.querySelector('.product_title, h1.entry-title');
      if (wooTitleEl) {
        detectedProduct = {
          title: wooTitleEl.innerText.trim(),
          price: ''
        };
      }
    } else if (window.wp || (document.body && document.body.className.indexOf('wp-') !== -1)) {
      platform = 'WordPress';
    } else if (window.Webflow) {
      platform = 'Webflow';
    } else if (window.wixData || window.Wix) {
      platform = 'Wix';
    }
  } catch (err) {}

  // Create container
  var container = document.createElement('div');
  container.id = 'whatin-widget-container';
  container.style.position = 'fixed';
  container.style.zIndex = '999999';
  container.style[config.position.includes('right') ? 'right' : 'left'] = '20px';
  container.style.bottom = '20px';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  // Floating trigger button
  var btn = document.createElement('button');
  btn.setAttribute('aria-label', 'Open WhatsApp Chat');
  btn.style.width = '60px';
  btn.style.height = '60px';
  btn.style.borderRadius = '50%';
  btn.style.backgroundColor = config.themeColor;
  btn.style.border = 'none';
  btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
  btn.style.cursor = 'pointer';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  btn.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
  btn.style.outline = 'none';

  btn.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.3C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15ZM16.56 14.39C16.31 14.27 15.09 13.67 14.86 13.58C14.63 13.5 14.47 13.46 14.3 13.71C14.14 13.96 13.67 14.51 13.52 14.68C13.38 14.84 13.23 14.87 12.98 14.74C12.74 14.62 11.94 14.36 11 13.52C10.26 12.87 9.76 12.06 9.62 11.81C9.47 11.57 9.6 11.43 9.73 11.31C9.84 11.2 9.97 11.02 10.1 10.87C10.22 10.73 10.27 10.62 10.35 10.46C10.43 10.29 10.39 10.15 10.33 10.02C10.27 9.9 9.79 8.71 9.58 8.22C9.39 7.74 9.18 7.81 9.03 7.8C8.89 7.79 8.72 7.79 8.56 7.79C8.39 7.79 8.12 7.85 7.89 8.1C7.66 8.35 7.02 8.95 7.02 10.18C7.02 11.4 7.91 12.58 8.04 12.74C8.16 12.91 9.8 15.44 12.3 16.52C12.89 16.78 13.36 16.93 13.71 17.04C14.31 17.23 14.85 17.2 15.28 17.14C15.76 17.07 16.76 16.53 16.97 15.95C17.18 15.38 17.18 14.89 17.12 14.79C17.06 14.69 16.89 14.51 16.56 14.39Z" fill="white"/></svg>';

  // Modal Card Popup
  var card = document.createElement('div');
  card.id = 'whatin-card';
  card.style.position = 'absolute';
  card.style.bottom = '75px';
  card.style[config.position.includes('right') ? 'right' : 'left'] = '0';
  card.style.width = '320px';
  card.style.backgroundColor = '#ffffff';
  card.style.borderRadius = '16px';
  card.style.boxShadow = '0 12px 36px rgba(0,0,0,0.18)';
  card.style.overflow = 'hidden';
  card.style.display = 'none';
  card.style.flexDirection = 'column';
  card.style.animation = 'whatinFadeIn 0.25s ease forwards';

  // Card Header
  var header = document.createElement('div');
  header.style.backgroundColor = config.themeColor;
  header.style.color = '#ffffff';
  header.style.padding = '16px';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';

  var headerLeft = document.createElement('div');
  headerLeft.style.display = 'flex';
  headerLeft.style.alignItems = 'center';
  headerLeft.style.gap = '10px';

  var avatar = document.createElement('div');
  avatar.style.width = '40px';
  avatar.style.height = '40px';
  avatar.style.borderRadius = '50%';
  avatar.style.backgroundColor = 'rgba(255,255,255,0.25)';
  avatar.style.display = 'flex';
  avatar.style.alignItems = 'center';
  avatar.style.justifyContent = 'center';
  avatar.style.fontSize = '18px';
  avatar.innerHTML = config.avatarUrl ? '<img src="' + config.avatarUrl + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />' : '💬';

  var headerText = document.createElement('div');
  var titleEl = document.createElement('div');
  titleEl.style.fontWeight = '700';
  titleEl.style.fontSize = '14px';
  titleEl.innerText = config.heading;

  var subEl = document.createElement('div');
  subEl.style.fontSize = '11.5px';
  subEl.style.opacity = '0.9';
  subEl.style.marginTop = '2px';
  subEl.innerText = config.subheading;

  headerText.appendChild(titleEl);
  headerText.appendChild(subEl);
  headerLeft.appendChild(avatar);
  headerLeft.appendChild(headerText);

  var closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.color = '#ffffff';
  closeBtn.style.fontSize = '22px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.lineHeight = '1';
  closeBtn.onclick = function() { card.style.display = 'none'; };

  header.appendChild(headerLeft);
  header.appendChild(closeBtn);

  // Card Body
  var body = document.createElement('div');
  body.style.padding = '16px';
  body.style.backgroundColor = '#f8fafc';
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '12px';

  var greetingBubble = document.createElement('div');
  greetingBubble.style.backgroundColor = '#ffffff';
  greetingBubble.style.padding = '12px 14px';
  greetingBubble.style.borderRadius = '12px';
  greetingBubble.style.fontSize = '13px';
  greetingBubble.style.lineHeight = '1.4';
  greetingBubble.style.color = '#1e293b';
  greetingBubble.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';

  var computedGreeting = config.welcomeMessage;
  if (detectedProduct && detectedProduct.title) {
    computedGreeting = 'Hi! Inquiring about ' + detectedProduct.title + ' from your store.';
  }
  greetingBubble.innerText = computedGreeting;
  body.appendChild(greetingBubble);

  // Determine smart contextual inquiry message
  var effectiveInquiryMsg = detectedProduct && detectedProduct.title
    ? ('Hi! I am interested in *' + detectedProduct.title + '*' + (detectedProduct.price ? ' (Price: ' + detectedProduct.price + ')' : '') + '\\n\\nProduct Link: ' + window.location.href)
    : (config.welcomeMessage + ' (Page: ' + document.title + ' - ' + window.location.href + ')');

  if (config.requireLeadForm) {
    var form = document.createElement('form');
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.gap = '8px';

    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Your Name';
    nameInput.required = true;
    nameInput.style.padding = '9px 12px';
    nameInput.style.borderRadius = '8px';
    nameInput.style.border = '1px solid #cbd5e1';
    nameInput.style.fontSize = '12.5px';
    nameInput.style.outline = 'none';

    var phoneInput = document.createElement('input');
    phoneInput.type = 'tel';
    phoneInput.placeholder = 'Mobile Number (10 digits)';
    phoneInput.required = true;
    phoneInput.style.padding = '9px 12px';
    phoneInput.style.borderRadius = '8px';
    phoneInput.style.border = '1px solid #cbd5e1';
    phoneInput.style.fontSize = '12.5px';
    phoneInput.style.outline = 'none';

    var submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.innerText = 'Start Chat on WhatsApp ➔';
    submitBtn.style.padding = '10px';
    submitBtn.style.borderRadius = '8px';
    submitBtn.style.backgroundColor = config.themeColor;
    submitBtn.style.color = '#ffffff';
    submitBtn.style.fontWeight = '700';
    submitBtn.style.fontSize = '13px';
    submitBtn.style.border = 'none';
    submitBtn.style.cursor = 'pointer';
    submitBtn.style.marginTop = '4px';

    form.appendChild(nameInput);
    form.appendChild(phoneInput);
    form.appendChild(submitBtn);

    form.onsubmit = function(e) {
      e.preventDefault();
      var nameVal = nameInput.value.trim();
      var phoneVal = phoneInput.value.trim();
      if (!phoneVal) return;

      submitBtn.disabled = true;
      submitBtn.innerText = 'Opening WhatsApp...';

      fetch(appUrl + '/api/widget/capture-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId,
          name: nameVal,
          phone: phoneVal,
          pageUrl: window.location.href,
          pageTitle: detectedProduct && detectedProduct.title ? (detectedProduct.title + ' (' + platform + ')') : document.title,
          platform: platform,
          utmSource: new URLSearchParams(window.location.search).get('utm_source') || (platform + ' Widget'),
          customMessage: effectiveInquiryMsg
        })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        window.open(data.whatsappUrl || ('https://wa.me/' + config.phoneNumber + '?text=' + encodeURIComponent(effectiveInquiryMsg)), '_blank');
        card.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.innerText = 'Start Chat on WhatsApp ➔';
      })
      .catch(function() {
        window.open('https://wa.me/' + config.phoneNumber + '?text=' + encodeURIComponent(effectiveInquiryMsg), '_blank');
        card.style.display = 'none';
        submitBtn.disabled = false;
      });
    };

    body.appendChild(form);
  } else {
    var directBtn = document.createElement('button');
    directBtn.innerText = 'Start WhatsApp Chat ➔';
    directBtn.style.padding = '11px';
    directBtn.style.borderRadius = '8px';
    directBtn.style.backgroundColor = config.themeColor;
    directBtn.style.color = '#ffffff';
    directBtn.style.fontWeight = '700';
    directBtn.style.fontSize = '13px';
    directBtn.style.border = 'none';
    directBtn.style.cursor = 'pointer';
    directBtn.style.textAlign = 'center';

    directBtn.onclick = function() {
      // Async click tracking
      fetch(appUrl + '/api/widget/capture-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId,
          pageUrl: window.location.href,
          pageTitle: detectedProduct && detectedProduct.title ? (detectedProduct.title + ' (' + platform + ')') : document.title,
          platform: platform,
          utmSource: new URLSearchParams(window.location.search).get('utm_source') || (platform + ' Widget'),
          customMessage: effectiveInquiryMsg
        })
      }).catch(function() {});

      window.open('https://wa.me/' + config.phoneNumber + '?text=' + encodeURIComponent(effectiveInquiryMsg), '_blank');
      card.style.display = 'none';
    };

    body.appendChild(directBtn);
  }

  card.appendChild(header);
  card.appendChild(body);

  btn.onclick = function() {
    card.style.display = card.style.display === 'none' ? 'flex' : 'none';
  };

  container.appendChild(card);
  container.appendChild(btn);
  document.body.appendChild(container);
})();
`;

  return new NextResponse(jsCode, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}
