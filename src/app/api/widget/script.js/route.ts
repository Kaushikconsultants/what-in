import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * GET /api/widget/script.js
 * Serves the dynamic, zero-dependency embeddable website widget JavaScript.
 * Supports:
 * - Multi-category client presets
 * - Proactive timed & exit-intent speech bubble nudge
 * - Multi-department chat routing
 * - Shopify / WooCommerce Cart Recovery inspection
 * - Business hours schedule & live pulsating online indicator
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId") || searchParams.get("tenant") || "";

  if (!clientId || clientId.trim().length < 5) {
    return new NextResponse("// WhatIn / WhatMore Widget: Missing or invalid clientId parameter.", {
      status: 400,
      headers: { "Content-Type": "application/javascript", ...corsHeaders },
    });
  }

  const client = await prisma.whatsAppClient.findUnique({
    where: { id: clientId.trim() },
    include: { websiteWidget: true },
  });

  if (!client || !client.isActive) {
    return new NextResponse("// WhatIn / WhatMore Widget: Client not found or inactive.", {
      status: 403,
      headers: { "Content-Type": "application/javascript", ...corsHeaders },
    });
  }

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
    clientCategory: "GENERAL",
    departments: [],
    proactiveNudge: false,
    nudgeDelaySeconds: 5,
    nudgeText: "👋 Need quick help or custom pricing? Chat with us!",
    enableCartRecovery: false,
    businessHoursEnabled: false,
    businessHoursStart: "09:00",
    businessHoursEnd: "18:00",
    timezone: "Asia/Kolkata",
    offlineNotice: "We are currently offline. Leave a message and we will get back to you during business hours!",
  };

  if (clientId) {
    const client = await prisma.whatsAppClient.findUnique({
      where: { id: clientId },
      include: { websiteWidget: true },
    });
    if (client) {
      if (client.phoneNumber) widgetConfig.phoneNumber = client.phoneNumber.replace(/\D/g, "");
      if (client.websiteWidget) {
        let depts = [];
        if (client.websiteWidget.departments) {
          try {
            depts = JSON.parse(client.websiteWidget.departments);
          } catch {
            depts = [];
          }
        }

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
          clientCategory: client.websiteWidget.clientCategory || "GENERAL",
          departments: depts,
          proactiveNudge: Boolean(client.websiteWidget.proactiveNudge),
          nudgeDelaySeconds: client.websiteWidget.nudgeDelaySeconds || 5,
          nudgeText: client.websiteWidget.nudgeText || widgetConfig.nudgeText,
          enableCartRecovery: Boolean(client.websiteWidget.enableCartRecovery),
          businessHoursEnabled: Boolean(client.websiteWidget.businessHoursEnabled),
          businessHoursStart: client.websiteWidget.businessHoursStart || "09:00",
          businessHoursEnd: client.websiteWidget.businessHoursEnd || "18:00",
          timezone: client.websiteWidget.timezone || "Asia/Kolkata",
          offlineNotice: client.websiteWidget.offlineNotice || widgetConfig.offlineNotice,
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
  var detectedCart = null;

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

  // Business Hours Calculation
  var isOnline = true;
  if (config.businessHoursEnabled) {
    try {
      var now = new Date();
      var nowMinutes = now.getHours() * 60 + now.getMinutes();
      var startParts = (config.businessHoursStart || '09:00').split(':');
      var endParts = (config.businessHoursEnd || '18:00').split(':');
      var startMinutes = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1] || 0, 10);
      var endMinutes = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1] || 0, 10);

      isOnline = nowMinutes >= startMinutes && nowMinutes <= endMinutes;
    } catch (e) {
      isOnline = true;
    }
  }

  // Create style element for animations
  var style = document.createElement('style');
  style.innerHTML = \`
    @keyframes whatinFadeIn {
      from { opacity: 0; transform: translateY(12px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes whatinPulseDot {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }
    .whatin-dept-item:hover {
      background-color: #f1f5f9 !important;
      transform: translateX(3px);
    }
  \`;
  document.head.appendChild(style);

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
  btn.style.position = 'relative';

  btn.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.3C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15ZM16.56 14.39C16.31 14.27 15.09 13.67 14.86 13.58C14.63 13.5 14.47 13.46 14.3 13.71C14.14 13.96 13.67 14.51 13.52 14.68C13.38 14.84 13.23 14.87 12.98 14.74C12.74 14.62 11.94 14.36 11 13.52C10.26 12.87 9.76 12.06 9.62 11.81C9.47 11.57 9.6 11.43 9.73 11.31C9.84 11.2 9.97 11.02 10.1 10.87C10.22 10.73 10.27 10.62 10.35 10.46C10.43 10.29 10.39 10.15 10.33 10.02C10.27 9.9 9.79 8.71 9.58 8.22C9.39 7.74 9.18 7.81 9.03 7.8C8.89 7.79 8.72 7.79 8.56 7.79C8.39 7.79 8.12 7.85 7.89 8.1C7.66 8.35 7.02 8.95 7.02 10.18C7.02 11.4 7.91 12.58 8.04 12.74C8.16 12.91 9.8 15.44 12.3 16.52C12.89 16.78 13.36 16.93 13.71 17.04C14.31 17.23 14.85 17.2 15.28 17.14C15.76 17.07 16.76 16.53 16.97 15.95C17.18 15.38 17.18 14.89 17.12 14.79C17.06 14.69 16.89 14.51 16.56 14.39Z" fill="white"/></svg>';

  // Status dot on trigger button
  var statusBadge = document.createElement('span');
  statusBadge.style.position = 'absolute';
  statusBadge.style.top = '2px';
  statusBadge.style.right = '2px';
  statusBadge.style.width = '14px';
  statusBadge.style.height = '14px';
  statusBadge.style.borderRadius = '50%';
  statusBadge.style.border = '2px solid #ffffff';
  statusBadge.style.backgroundColor = isOnline ? '#22c55e' : '#eab308';
  if (isOnline) {
    statusBadge.style.animation = 'whatinPulseDot 2s infinite';
  }
  btn.appendChild(statusBadge);

  // Proactive Nudge Speech Bubble
  var nudge = null;
  var nudgeDismissed = false;

  function createNudgeBubble() {
    if (nudgeDismissed || nudge || card.style.display === 'flex') return;

    nudge = document.createElement('div');
    nudge.id = 'whatin-nudge-bubble';
    nudge.style.position = 'absolute';
    nudge.style.bottom = '75px';
    nudge.style[config.position.includes('right') ? 'right' : 'left'] = '0';
    nudge.style.width = '260px';
    nudge.style.backgroundColor = '#ffffff';
    nudge.style.borderRadius = '14px';
    nudge.style.boxShadow = '0 10px 30px rgba(0,0,0,0.18)';
    nudge.style.padding = '12px 14px';
    nudge.style.display = 'flex';
    nudge.style.alignItems = 'flex-start';
    nudge.style.gap = '10px';
    nudge.style.cursor = 'pointer';
    nudge.style.animation = 'whatinFadeIn 0.3s ease forwards';

    var nAvatar = document.createElement('div');
    nAvatar.style.fontSize = '20px';
    nAvatar.innerText = '💬';

    var nContent = document.createElement('div');
    nContent.style.flex = '1';
    nContent.style.fontSize = '12.5px';
    nContent.style.color = '#0f172a';
    nContent.style.fontWeight = '500';
    nContent.style.lineHeight = '1.4';
    nContent.innerText = config.nudgeText;

    var nClose = document.createElement('button');
    nClose.innerHTML = '&times;';
    nClose.style.background = 'none';
    nClose.style.border = 'none';
    nClose.style.color = '#94a3b8';
    nClose.style.fontSize = '18px';
    nClose.style.cursor = 'pointer';
    nClose.style.padding = '0';
    nClose.style.lineHeight = '1';

    nClose.onclick = function(e) {
      e.stopPropagation();
      nudgeDismissed = true;
      if (nudge) {
        nudge.remove();
        nudge = null;
      }
    };

    nudge.appendChild(nAvatar);
    nudge.appendChild(nContent);
    nudge.appendChild(nClose);

    nudge.onclick = function() {
      if (nudge) {
        nudge.remove();
        nudge = null;
      }
      card.style.display = 'flex';
    };

    container.appendChild(nudge);
  }

  // Trigger Proactive Nudge via timer
  if (config.proactiveNudge) {
    var delayMs = (config.nudgeDelaySeconds || 5) * 1000;
    setTimeout(function() {
      createNudgeBubble();
    }, delayMs);

    // Desktop Exit Intent trigger
    if (!isMobile) {
      document.addEventListener('mouseleave', function(e) {
        if (e.clientY <= 20) {
          createNudgeBubble();
        }
      });
    }
  }

  // Modal Card Popup
  var card = document.createElement('div');
  card.id = 'whatin-card';
  card.style.position = 'absolute';
  card.style.bottom = '75px';
  card.style[config.position.includes('right') ? 'right' : 'left'] = '0';
  card.style.width = '330px';
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
  avatar.style.width = '42px';
  avatar.style.height = '42px';
  avatar.style.borderRadius = '50%';
  avatar.style.backgroundColor = 'rgba(255,255,255,0.25)';
  avatar.style.display = 'flex';
  avatar.style.alignItems = 'center';
  avatar.style.justifyContent = 'center';
  avatar.style.fontSize = '20px';
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
  subEl.style.display = 'flex';
  subEl.style.alignItems = 'center';
  subEl.style.gap = '5px';

  var dotSpan = document.createElement('span');
  dotSpan.style.display = 'inline-block';
  dotSpan.style.width = '7px';
  dotSpan.style.height = '7px';
  dotSpan.style.borderRadius = '50%';
  dotSpan.style.backgroundColor = isOnline ? '#4ade80' : '#fde047';

  var statusTextSpan = document.createElement('span');
  statusTextSpan.innerText = isOnline ? (config.subheading || 'Online now') : 'Offline - Leave a message';

  subEl.appendChild(dotSpan);
  subEl.appendChild(statusTextSpan);

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
  body.style.maxHeight = '420px';
  body.style.overflowY = 'auto';

  // Offline Notice Banner
  if (!isOnline && config.offlineNotice) {
    var offlineBox = document.createElement('div');
    offlineBox.style.backgroundColor = '#fef3c7';
    offlineBox.style.border = '1px solid #fde68a';
    offlineBox.style.padding = '8px 10px';
    offlineBox.style.borderRadius = '8px';
    offlineBox.style.fontSize = '11.5px';
    offlineBox.style.color = '#92400e';
    offlineBox.style.lineHeight = '1.3';
    offlineBox.innerText = '🌙 ' + config.offlineNotice;
    body.appendChild(offlineBox);
  }

  // Persistent Multi-Visit Visitor Identification (Stored in localStorage across future website visits)
  var visitorUuid = null;
  try {
    visitorUuid = localStorage.getItem('__whatin_visitor_uuid');
    if (!visitorUuid) {
      visitorUuid = 'V-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
      localStorage.setItem('__whatin_visitor_uuid', visitorUuid);
    }
  } catch (e) {
    visitorUuid = 'V-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  var identifiedPhone = null;
  try {
    identifiedPhone = localStorage.getItem('__whatin_identified_phone') || null;
  } catch (e) {}

  function setIdentifiedPhone(ph) {
    if (!ph) return;
    var clean = String(ph).replace(/\D/g, '');
    if (clean.length >= 10) {
      identifiedPhone = clean;
      try { localStorage.setItem('__whatin_identified_phone', clean); } catch (e) {}
    }
  }

  // Persistent Visitor Session Reference (Stored in browser storage across page navigation)
  var visitorSessionId = null;
  try {
    visitorSessionId = sessionStorage.getItem('__whatin_session_ref');
    if (!visitorSessionId) {
      visitorSessionId = 'W' + Math.random().toString(36).substring(2, 6).toUpperCase();
      sessionStorage.setItem('__whatin_session_ref', visitorSessionId);
    }
  } catch (e) {
    visitorSessionId = 'W' + Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  // Session & Browsing Journey Management (Education, E-Commerce, Real Estate, Healthcare)
  var SESSION_KEY_JOURNEY = '__whatin_page_journey';
  var SESSION_KEY_SEARCHES = '__whatin_searches';
  var SESSION_KEY_INSIGHTS = '__whatin_insights';
  var SESSION_KEY_START = '__whatin_session_start';

  var sessionStartTime = Date.now();
  try {
    var storedStart = sessionStorage.getItem(SESSION_KEY_START);
    if (storedStart) {
      sessionStartTime = parseInt(storedStart, 10);
    } else {
      sessionStorage.setItem(SESSION_KEY_START, String(sessionStartTime));
    }
  } catch (e) {}

  // 1. Record Current Page Visit in Journey Trail
  var pageJourney = [];
  try {
    var rawJourney = sessionStorage.getItem(SESSION_KEY_JOURNEY);
    if (rawJourney) {
      pageJourney = JSON.parse(rawJourney);
      if (!Array.isArray(pageJourney)) pageJourney = [];
    }
  } catch (e) { pageJourney = []; }

  var pageEnterTime = Date.now();
  var currentPath = window.location.pathname || '/';
  var currentTitle = (document.title || currentPath).trim();
  var currentUrl = window.location.href;

  var lastEntry = pageJourney.length > 0 ? pageJourney[pageJourney.length - 1] : null;
  if (!lastEntry || lastEntry.path !== currentPath) {
    pageJourney.push({
      path: currentPath,
      title: currentTitle.slice(0, 100),
      url: currentUrl,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dwellSec: 0
    });
    if (pageJourney.length > 15) {
      pageJourney = pageJourney.slice(-15);
    }
    try {
      sessionStorage.setItem(SESSION_KEY_JOURNEY, JSON.stringify(pageJourney));
    } catch (e) {}
  }

  function updateCurrentDwellTime() {
    if (pageJourney.length > 0) {
      var elapsed = Math.max(1, Math.round((Date.now() - pageEnterTime) / 1000));
      pageJourney[pageJourney.length - 1].dwellSec = elapsed;
      try {
        sessionStorage.setItem(SESSION_KEY_JOURNEY, JSON.stringify(pageJourney));
      } catch (e) {}
    }
  }
  window.addEventListener('beforeunload', updateCurrentDwellTime);

  // 2. Search Query Detection (URL query params & form/input search queries)
  var detectedSearches = [];
  try {
    var rawSearches = sessionStorage.getItem(SESSION_KEY_SEARCHES);
    if (rawSearches) {
      detectedSearches = JSON.parse(rawSearches);
      if (!Array.isArray(detectedSearches)) detectedSearches = [];
    }
  } catch (e) { detectedSearches = []; }

  function recordSearchQuery(term) {
    if (!term || typeof term !== 'string') return;
    var cleanTerm = term.trim();
    if (cleanTerm.length < 2 || cleanTerm.length > 100) return;
    if (detectedSearches.indexOf(cleanTerm) === -1) {
      detectedSearches.push(cleanTerm);
      if (detectedSearches.length > 10) detectedSearches = detectedSearches.slice(-10);
      try {
        sessionStorage.setItem(SESSION_KEY_SEARCHES, JSON.stringify(detectedSearches));
      } catch (e) {}
      // Automatically send live search telemetry to CRM without WhatsApp message!
      sendLiveTelemetry('SEARCH', { searchQuery: cleanTerm });
    }
  }

  try {
    var urlParams = new URLSearchParams(window.location.search);
    var searchKeys = ['q', 's', 'search', 'query', 'keyword', 'term', 'course', 'university', 'college', 'destination'];
    for (var sk = 0; sk < searchKeys.length; sk++) {
      var sval = urlParams.get(searchKeys[sk]);
      if (sval) recordSearchQuery(sval);
    }
  } catch (e) {}

  try {
    document.addEventListener('submit', function(e) {
      var form = e.target;
      if (!form) return;
      var inputs = form.querySelectorAll('input[type="search"], input[name="q"], input[name="s"], input[name="search"], input[name*="query"], input[name*="keyword"]');
      for (var j = 0; j < inputs.length; j++) {
        if (inputs[j].value) recordSearchQuery(inputs[j].value);
      }
    }, true);

    document.addEventListener('change', function(e) {
      var input = e.target;
      if (!input || input.tagName !== 'INPUT') return;
      var isSearchInput = input.type === 'search' || 
        ['q', 's', 'search', 'query'].indexOf(input.name) !== -1 ||
        (input.placeholder && /search|course|university|college|find/i.test(input.placeholder));
      if (isSearchInput && input.value) {
        recordSearchQuery(input.value);
      }
    }, true);
  } catch (e) {}

  // 3. Multi-Category Smart Extractor (Education, Real Estate, Healthcare, E-Commerce)
  var categoryInsights = {
    category: config.clientCategory || 'GENERAL',
    courses: [],
    universities: [],
    destinations: [],
    products: [],
    properties: [],
    specialties: []
  };

  try {
    var rawInsights = sessionStorage.getItem(SESSION_KEY_INSIGHTS);
    if (rawInsights) {
      var parsed = JSON.parse(rawInsights);
      if (parsed && typeof parsed === 'object') {
        categoryInsights = parsed;
        if (!categoryInsights.courses) categoryInsights.courses = [];
        if (!categoryInsights.universities) categoryInsights.universities = [];
        if (!categoryInsights.destinations) categoryInsights.destinations = [];
        if (!categoryInsights.products) categoryInsights.products = [];
        if (!categoryInsights.properties) categoryInsights.properties = [];
        if (!categoryInsights.specialties) categoryInsights.specialties = [];
      }
    }
  } catch (e) {}

  function addUniqueInsight(arr, val, maxLen) {
    if (!val || typeof val !== 'string') return;
    var c = val.trim();
    if (c.length < 2 || c.length > 80) return;
    if (arr.indexOf(c) === -1) {
      arr.push(c);
      if (arr.length > (maxLen || 6)) arr.shift();
    }
  }

  try {
    var fullPageText = (document.title + ' ' + window.location.pathname).toLowerCase();
    var pageH1El = document.querySelector('h1');
    var pageH1 = pageH1El ? pageH1El.innerText.trim() : '';

    // Education Consultancy Intelligence
    var isEducationSite = config.clientCategory === 'EDUCATION' || 
      /course|program|degree|university|college|study-abroad|admission|scholarship|ielts|visa|campus|intake/i.test(window.location.href);

    if (isEducationSite) {
      if (categoryInsights.category === 'GENERAL') categoryInsights.category = 'EDUCATION';

      var countryPatterns = [
        { name: 'United Kingdom (UK)', regex: /\b(uk|united kingdom|london|england|scotland)\b/i },
        { name: 'Canada', regex: /\b(canada|toronto|vancouver|ontario)\b/i },
        { name: 'United States (USA)', regex: /\b(usa|united states|america|california|new york)\b/i },
        { name: 'Australia', regex: /\b(australia|sydney|melbourne|brisbane)\b/i },
        { name: 'Germany', regex: /\b(germany|berlin|munich)\b/i },
        { name: 'Ireland', regex: /\b(ireland|dublin)\b/i },
        { name: 'New Zealand', regex: /\b(new zealand|auckland)\b/i },
        { name: 'Dubai / UAE', regex: /\b(dubai|uae)\b/i },
        { name: 'Europe', regex: /\b(europe|france|italy|poland|netherlands)\b/i }
      ];
      countryPatterns.forEach(function(cp) {
        if (cp.regex.test(fullPageText)) {
          addUniqueInsight(categoryInsights.destinations, cp.name, 5);
        }
      });

      var coursePatterns = [
        { name: 'MBA / Business Admin', regex: /\b(mba|master of business|bba|business management|executive mba)\b/i },
        { name: 'Computer Science / IT', regex: /\b(computer science|ms in cs|b\.?tech cs|software engineering|information technology)\b/i },
        { name: 'Data Science & AI', regex: /\b(data science|artificial intelligence|machine learning|data analytics)\b/i },
        { name: 'Medicine & Healthcare', regex: /\b(mbbs|medicine|nursing|pharmacy|biotechnology|dentistry)\b/i },
        { name: 'Engineering', regex: /\b(mechanical engineering|civil engineering|electrical engineering|aerospace)\b/i },
        { name: 'Finance & Accounting', regex: /\b(finance|accounting|fintech|economics)\b/i },
        { name: 'Law / LLM', regex: /\b(llm|llb|law degree|international law)\b/i },
        { name: 'Hospitality & Tourism', regex: /\b(hospitality|hotel management|tourism)\b/i }
      ];
      coursePatterns.forEach(function(kp) {
        if (kp.regex.test(fullPageText)) {
          addUniqueInsight(categoryInsights.courses, kp.name, 6);
        }
      });

      if (pageH1 && pageH1.length < 65) {
        if (/university|college|institute|academy/i.test(pageH1)) {
          addUniqueInsight(categoryInsights.universities, pageH1, 5);
        } else if (/master|bachelor|mba|msc|btech|diploma|degree|phd/i.test(pageH1)) {
          addUniqueInsight(categoryInsights.courses, pageH1, 6);
        }
      }

      var pathSegments = window.location.pathname.split('/').filter(Boolean);
      for (var ps = 0; ps < pathSegments.length; ps++) {
        var segClean = decodeURIComponent(pathSegments[ps]).replace(/[-_]/g, ' ');
        if (ps > 0 && /universit|college|institution/i.test(pathSegments[ps - 1])) {
          addUniqueInsight(categoryInsights.universities, segClean.toUpperCase(), 5);
        } else if (ps > 0 && /course|program|degree/i.test(pathSegments[ps - 1])) {
          addUniqueInsight(categoryInsights.courses, segClean.toUpperCase(), 6);
        }
      }
    }

    // Real Estate Intelligence
    var isRealEstate = config.clientCategory === 'REAL_ESTATE' || /property|real-estate|flat|villa|apartment|bhk|plot|floor-plan/i.test(window.location.href);
    if (isRealEstate) {
      if (categoryInsights.category === 'GENERAL') categoryInsights.category = 'REAL_ESTATE';
      if (pageH1 && pageH1.length < 65) {
        addUniqueInsight(categoryInsights.properties, pageH1, 5);
      }
      var bhkMatch = fullPageText.match(/\b([1-5]\s*bhk|villa|penthouse|studio apartment|duplex|residential plot)\b/i);
      if (bhkMatch) {
        addUniqueInsight(categoryInsights.properties, bhkMatch[0].toUpperCase(), 5);
      }
    }

    // Healthcare & Clinic Intelligence
    var isHealthcare = config.clientCategory === 'HEALTHCARE' || /doctor|clinic|hospital|treatment|surgery|specialist/i.test(window.location.href);
    if (isHealthcare) {
      if (categoryInsights.category === 'GENERAL') categoryInsights.category = 'HEALTHCARE';
      var specList = ['Cardiology', 'Dermatology', 'Orthopedics', 'Pediatrics', 'Dental', 'Neurology', 'IVF & Fertility', 'Ophthalmology', 'ENT'];
      specList.forEach(function(sp) {
        if (new RegExp(sp, 'i').test(fullPageText)) {
          addUniqueInsight(categoryInsights.specialties, sp, 5);
        }
      });
      if (pageH1 && (/dr\.|\bdoctor\b/i.test(pageH1) || /clinic|hospital/i.test(pageH1))) {
        addUniqueInsight(categoryInsights.specialties, pageH1, 5);
      }
    }

    // E-Commerce Accumulation
    if (detectedProduct && detectedProduct.title) {
      addUniqueInsight(categoryInsights.products, detectedProduct.title + (detectedProduct.price ? (' (₹' + detectedProduct.price + ')') : ''), 6);
    }

    try {
      sessionStorage.setItem(SESSION_KEY_INSIGHTS, JSON.stringify(categoryInsights));
    } catch (e) {}
  } catch (e) {}

  // Helper to generate or reuse visitor reference token
  function generateRefCode() {
    return visitorSessionId || ('W' + Math.random().toString(36).substring(2, 6).toUpperCase());
  }

  // Centralized Payload Generator
  function buildPayload(extra) {
    updateCurrentDwellTime();
    var durationSec = Math.max(1, Math.round((Date.now() - sessionStartTime) / 1000));
    var payload = {
      clientId: clientId,
      refId: generateRefCode(),
      visitorUuid: visitorUuid,
      identifiedPhone: identifiedPhone || null,
      phone: identifiedPhone || null,
      pageUrl: window.location.href,
      pageTitle: (detectedProduct && detectedProduct.title) ? (detectedProduct.title + ' (' + platform + ')') : document.title,
      platform: platform,
      detectedProduct: detectedProduct,
      cart: detectedCart,
      pageJourney: pageJourney,
      searches: detectedSearches,
      categoryInsights: categoryInsights,
      sessionStats: {
        pageViews: pageJourney.length,
        totalDurationSec: durationSec
      },
      utmSource: new URLSearchParams(window.location.search).get('utm_source') || (platform + ' Widget')
    };

    if (extra) {
      for (var k in extra) {
        if (extra.hasOwnProperty(k)) payload[k] = extra[k];
      }
    }
    return payload;
  }

  // Silent Automatic Background Telemetry (Updates CRM history without user clicking WhatsApp)
  function sendLiveTelemetry(eventType, extra) {
    try {
      var payload = buildPayload({
        eventType: eventType || 'PAGE_VIEW',
        isLiveActivity: true
      });
      if (extra) {
        for (var k in extra) {
          if (extra.hasOwnProperty(k)) payload[k] = extra[k];
        }
      }
      var strPayload = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(appUrl + '/api/widget/capture-lead', new Blob([strPayload], { type: 'text/plain;charset=UTF-8' }));
      } else {
        fetch(appUrl + '/api/widget/capture-lead', {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: strPayload,
          keepalive: true
        }).catch(function() {});
      }
    } catch (e) {}
  }

  // ⚡ Automatic Live Telemetry Triggers:
  // 1. Silent Page View Telemetry 1.2 seconds after DOM is ready
  setTimeout(function() {
    sendLiveTelemetry('PAGE_VIEW');
  }, 1200);

  // 2. Auto-capture visitor phone from any form input on website (e.g. checkout, contact forms)
  try {
    document.addEventListener('blur', function(e) {
      var target = e.target;
      if (!target || target.tagName !== 'INPUT') return;
      var isPhoneInput = target.type === 'tel' || target.name === 'phone' || target.id === 'phone' || /phone|mobile/i.test(target.placeholder || target.name || '');
      if (isPhoneInput && target.value) {
        var clean = target.value.replace(/\D/g, '');
        if (clean.length >= 10) {
          setIdentifiedPhone(clean);
          sendLiveTelemetry('IDENTIFIED', { identifiedPhone: clean });
        }
      }
    }, true);
  } catch (e) {}


  // Cart Recovery & Active Cart Inspection for Shopify
  var cartBox = null;

  function updateAndSyncCart(shouldFireBackend) {
    if (platform === 'Shopify') {
      fetch('/cart.js')
        .then(function(r) { return r.json(); })
        .then(function(cart) {
          if (cart && typeof cart.item_count === 'number') {
            detectedCart = {
              item_count: cart.item_count,
              total_price: cart.total_price ? (cart.total_price / 100) : 0,
              currency: cart.currency || 'INR',
              items: (cart.items || []).map(function(it) {
                return {
                  title: it.title || it.product_title,
                  quantity: it.quantity,
                  price: it.price ? (it.price / 100) : 0,
                  image: it.image || (it.featured_image ? it.featured_image.url : ''),
                  variant_title: it.variant_title || null,
                  url: it.url ? (window.location.origin + it.url) : null
                };
              })
            };

            if (config.enableCartRecovery && cart.item_count > 0) {
              var itemTitles = cart.items.map(function(it) { return it.title; }).slice(0, 2).join(', ');
              if (cart.items.length > 2) itemTitles += ' +' + (cart.items.length - 2) + ' more';

              if (!cartBox) {
                cartBox = document.createElement('div');
                cartBox.id = 'whatin-cart-box';
                cartBox.style.backgroundColor = '#ecfdf5';
                cartBox.style.border = '1px solid #a7f3d0';
                cartBox.style.padding = '10px';
                cartBox.style.borderRadius = '10px';
                cartBox.style.fontSize = '12px';
                cartBox.style.color = '#065f46';

                var cartAction = document.createElement('button');
                cartAction.innerText = 'Ask for Cart Help / Discount ➔';
                cartAction.style.width = '100%';
                cartAction.style.marginTop = '6px';
                cartAction.style.padding = '6px';
                cartAction.style.backgroundColor = '#059669';
                cartAction.style.color = '#ffffff';
                cartAction.style.border = 'none';
                cartAction.style.borderRadius = '6px';
                cartAction.style.fontWeight = '600';
                cartAction.style.fontSize = '11.5px';
                cartAction.style.cursor = 'pointer';

                cartAction.onclick = function() {
                  openWhatsAppWithSession('Hi! Can you assist with my order / available offers?');
                };

                cartBox.appendChild(cartAction);
                body.insertBefore(cartBox, body.firstChild);
              }

              var summarySpan = cartBox.querySelector('strong');
              if (summarySpan) {
                summarySpan.innerText = '🛒 ' + cart.item_count + ' items in your cart';
              }
            } else if (cartBox && cart.item_count === 0) {
              cartBox.remove();
              cartBox = null;
            }

            // Immediately fire live Add to Cart event to our software backend with full journey!
            if (shouldFireBackend && cart.item_count > 0) {
              try {
                var cartPayload = JSON.stringify(buildPayload({
                  eventType: 'ADD_TO_CART',
                  utmSource: new URLSearchParams(window.location.search).get('utm_source') || (platform + ' AddToCart')
                }));

                if (navigator.sendBeacon) {
                  navigator.sendBeacon(appUrl + '/api/widget/capture-lead', new Blob([cartPayload], { type: 'text/plain;charset=UTF-8' }));
                } else {
                  fetch(appUrl + '/api/widget/capture-lead', {
                    method: 'POST',
                    mode: 'cors',
                    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                    body: cartPayload,
                    keepalive: true
                  }).catch(function() {});
                }
              } catch (_) {}
            }
          }
        })
        .catch(function() {});
    }
  }

  // Initial cart fetch on page load
  updateAndSyncCart(false);

  // Real-Time AJAX Interceptor for Add-To-Cart actions (Shopify & WooCommerce)
  try {
    if (window.fetch) {
      var originalFetch = window.fetch;
      window.fetch = function() {
        var args = arguments;
        var url = args[0];
        var isCartApi = typeof url === 'string' && (
          url.indexOf('/cart/add') !== -1 ||
          url.indexOf('/cart/change') !== -1 ||
          url.indexOf('/cart/update') !== -1 ||
          url.indexOf('/cart/clear') !== -1
        );

        return originalFetch.apply(this, args).then(function(response) {
          if (isCartApi) {
            setTimeout(function() { updateAndSyncCart(true); }, 350);
          }
          return response;
        });
      };
    }

    if (window.XMLHttpRequest) {
      var originalOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        this.__whatin_is_cart = typeof url === 'string' && (
          url.indexOf('/cart/add') !== -1 ||
          url.indexOf('/cart/change') !== -1 ||
          url.indexOf('/cart/update') !== -1
        );
        return originalOpen.apply(this, arguments);
      };

      var originalSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.send = function() {
        if (this.__whatin_is_cart) {
          this.addEventListener('load', function() {
            setTimeout(function() { updateAndSyncCart(true); }, 350);
          });
        }
        return originalSend.apply(this, arguments);
      };
    }

    document.addEventListener('cart:updated', function() { updateAndSyncCart(true); });
    document.addEventListener('cart:build', function() { updateAndSyncCart(true); });
    document.addEventListener('ajaxCart.afterCartLoad', function() { updateAndSyncCart(true); });

    document.addEventListener('click', function(e) {
      var target = e.target;
      if (!target) return;
      var btn = target.closest('button[name="add"], .btn-add-to-cart, [data-add-to-cart], .product-form__submit, .single_add_to_cart_button');
      if (btn) {
        setTimeout(function() { updateAndSyncCart(true); }, 750);
      }
    }, true);
  } catch (err) {}

  // Send visitor session context to backend and launch WhatsApp with 100% clean prefilled text (NO ref codes in text)
  function openWhatsAppWithSession(cleanText, targetPhoneOverride) {
    var phoneToUse = (targetPhoneOverride || config.phoneNumber || '').replace(/\D/g, '');
    var textToSend = cleanText;

    try {
      var payloadData = JSON.stringify(buildPayload({
        customMessage: cleanText
      }));

      if (navigator.sendBeacon) {
        navigator.sendBeacon(appUrl + '/api/widget/capture-lead', new Blob([payloadData], { type: 'text/plain;charset=UTF-8' }));
      } else {
        fetch(appUrl + '/api/widget/capture-lead', {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: payloadData,
          keepalive: true
        }).catch(function() {});
      }
    } catch (err) {}

    window.open('https://wa.me/' + phoneToUse + '?text=' + encodeURIComponent(textToSend), '_blank');
    card.style.display = 'none';
  }

  // Greeting Bubble
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
  } else if (categoryInsights.courses && categoryInsights.courses.length > 0) {
    computedGreeting = 'Hi! I am interested in ' + categoryInsights.courses[0] + (categoryInsights.universities && categoryInsights.universities[0] ? (' at ' + categoryInsights.universities[0]) : '') + '. Could you share details?';
  } else if (categoryInsights.properties && categoryInsights.properties.length > 0) {
    computedGreeting = 'Hi! Inquiring about ' + categoryInsights.properties[0] + ' from your website.';
  } else if (categoryInsights.specialties && categoryInsights.specialties.length > 0) {
    computedGreeting = 'Hi! I would like consultation regarding ' + categoryInsights.specialties[0] + '.';
  }
  greetingBubble.innerText = computedGreeting;
  body.appendChild(greetingBubble);

  // Multi-department list rendering
  if (Array.isArray(config.departments) && config.departments.length > 0) {
    var deptHeader = document.createElement('div');
    deptHeader.style.fontSize = '11px';
    deptHeader.style.fontWeight = '700';
    deptHeader.style.textTransform = 'uppercase';
    deptHeader.style.letterSpacing = '0.05em';
    deptHeader.style.color = '#64748b';
    deptHeader.innerText = 'Select a Department';
    body.appendChild(deptHeader);

    var deptContainer = document.createElement('div');
    deptContainer.style.display = 'flex';
    deptContainer.style.flexDirection = 'column';
    deptContainer.style.gap = '6px';

    config.departments.forEach(function(dept) {
      var dBtn = document.createElement('button');
      dBtn.className = 'whatin-dept-item';
      dBtn.style.display = 'flex';
      dBtn.style.alignItems = 'center';
      dBtn.style.justifyContent = 'space-between';
      dBtn.style.padding = '9px 12px';
      dBtn.style.backgroundColor = '#ffffff';
      dBtn.style.border = '1px solid #e2e8f0';
      dBtn.style.borderRadius = '10px';
      dBtn.style.cursor = 'pointer';
      dBtn.style.textAlign = 'left';
      dBtn.style.transition = 'all 0.15s ease';

      var dLeft = document.createElement('div');
      var dTitle = document.createElement('div');
      dTitle.style.fontWeight = '600';
      dTitle.style.fontSize = '12.5px';
      dTitle.style.color = '#0f172a';
      dTitle.innerText = dept.title || dept.name;

      var dDesc = document.createElement('div');
      dDesc.style.fontSize = '11px';
      dDesc.style.color = '#64748b';
      dDesc.innerText = dept.description || '';

      dLeft.appendChild(dTitle);
      if (dept.description) dLeft.appendChild(dDesc);

      var dArrow = document.createElement('span');
      dArrow.innerText = '➔';
      dArrow.style.color = config.themeColor;
      dArrow.style.fontSize = '12px';

      dBtn.appendChild(dLeft);
      dBtn.appendChild(dArrow);

      dBtn.onclick = function() {
        var targetPhone = (dept.phone || config.phoneNumber).replace(/\\D/g, '');
        openWhatsAppWithSession('Hi! I would like to connect with ' + (dept.title || dept.name) + '.', targetPhone);
      };

      deptContainer.appendChild(dBtn);
    });

    body.appendChild(deptContainer);
  }

  // Clean prefilled inquiry message (No URL dumps, no page links in text)
  var cleanInquiryMsg = detectedProduct && detectedProduct.title
    ? ('Hi! Can I get more info on ' + detectedProduct.title + '?')
    : (config.welcomeMessage || 'Hello! Can I get more info on this?');

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
      setIdentifiedPhone(phoneVal);
      if (!phoneVal) return;

      submitBtn.disabled = true;
      submitBtn.innerText = 'Opening WhatsApp...';

      var refCode = generateRefCode();
      var textToSend = cleanInquiryMsg;

      fetch(appUrl + '/api/widget/capture-lead', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(buildPayload({
          name: nameVal,
          phone: phoneVal,
          customMessage: cleanInquiryMsg
        }))
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        window.open(data.whatsappUrl || ('https://wa.me/' + config.phoneNumber + '?text=' + encodeURIComponent(textToSend)), '_blank');
        card.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.innerText = 'Start Chat on WhatsApp ➔';
      })
      .catch(function() {
        window.open('https://wa.me/' + config.phoneNumber + '?text=' + encodeURIComponent(textToSend), '_blank');
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
      openWhatsAppWithSession(cleanInquiryMsg);
    };

    body.appendChild(directBtn);
  }

  card.appendChild(header);
  card.appendChild(body);

  btn.onclick = function() {
    if (nudge) {
      nudge.remove();
      nudge = null;
    }
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
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}
