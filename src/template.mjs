import { content } from "./content.mjs";
export const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const br = (s) => escape(s).replaceAll("\n", "<br>");
const paths = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  up: '<path d="M7 17 17 7M7 7h10v10"/>',
  send: '<path d="m21 3-7 18-4-7-7-4 18-7ZM10 14 21 3"/>',
  receive: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-1 1v-9.5A8.5 8.5 0 0 1 11.5 3H13a8 8 0 0 1 8 8.5Z"/><path d="M7 9h10M7 13h6"/>',
  people:
    '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4c2 1 3 3 3 6"/>',
  wallet:
    '<path d="M20 8V5H5a2 2 0 0 0 0 4h16v11H5a2 2 0 0 1-2-2V7m18 6h-5v3h5"/>',
  shield:
    '<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z"/><path d="m8 12 3 3 5-6"/>',
  home: '<path d="m3 10 9-7 9 7v11h-7v-7h-4v7H3V10Z"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  account:
    '<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  refresh: '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  spark:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  instagram:
    '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  github:
    '<path d="M9 19c-4 1-4-2-6-2m12 5v-4a3.5 3.5 0 0 0-1-2.8c3.3-.4 6.8-1.6 6.8-7.3a5.7 5.7 0 0 0-1.5-4 5.2 5.2 0 0 0-.1-4S18 0 15 2a14 14 0 0 0-7 0C5 0 3.8.9 3.8.9a5.2 5.2 0 0 0-.1 4 5.7 5.7 0 0 0-1.5 4c0 5.7 3.5 7 6.8 7.3A3.5 3.5 0 0 0 8 19v3" transform="translate(1 1) scale(.9)"/>',
};
export const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
// The eye layer follows the original 160×160 logo; no bitmap replacement.
const mascot = (assets, size = 64) =>
  `<span class="movya-mascot" style="--mascot-size:${size}px" aria-hidden="true"><img class="movya-base" src="${assets}movya-logo.png" width="${size}" height="${size}" alt=""><span class="movya-eye"><svg viewBox="0 0 18 20" fill="none"><path d="M3 9Q8.5 13.5 14.5 8.5" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg></span></span>`;
const brand = (assets, suffix = "") =>
  `<a class="brand ${suffix}" href="#top" aria-label="Movya Wallet">${mascot(assets)}<span>movya<span class="brand-wallet">wallet</span></span></a>`;
const asset = (assets, code, name, value) =>
  `<div class="asset-row"><img src="${assets}token-${code.toLowerCase()}.png" width="36" height="36" alt=""><span class="asset-name"><strong>${name}</strong><small>${code}</small></span><span class="asset-value">${value}<small>${code}</small></span></div>`;
export function renderPage(
  lang,
  { origin = "https://movyawallet.com", basePath = "" } = {},
) {
  const t = content[lang];
  const base = basePath || "";
  const assets = `${base}/assets/`;
  const route = (l) => `${base}/${l === "es" ? "es/" : ""}`;
  const canonical = new URL(route(lang), origin).href;
  const social = new URL(`${base}/assets/social-${lang}.png`, origin).href;
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "Movya Wallet",
        url: origin,
        logo: new URL(`${base}/assets/movya-logo.png`, origin).href,
        sameAs: [
          "https://www.instagram.com/movya_wallet/",
          "https://github.com/ManuelElias1999/Movya-Wallet-Stellar",
        ],
      },
      {
        "@type": "WebPage",
        name: t.meta.title,
        description: t.meta.description,
        url: canonical,
        inLanguage: lang,
        publisher: { "@id": `${origin}/#organization` },
      },
      {
        "@type": "FAQPage",
        mainEntity: t.faq.items.map(([name, text]) => ({
          "@type": "Question",
          name,
          acceptedAnswer: { "@type": "Answer", text },
        })),
      },
    ],
  };
  const optionalDetails = [
    ["name", "text", "name", 120, true],
    ["country", "text", "country-name", 100, false],
    ["city", "text", "address-level2", 120, false],
    ["phone", "tel", "tel", 40, true],
  ].map(([key, type, autocomplete, max, wide]) =>
    `<div class="whitelist-field${wide ? " whitelist-field-wide" : ""}"><label for="whitelist-${key}">${escape(t.whitelist[key])}<small>${t.whitelist.optional}</small></label><input id="whitelist-${key}" name="${key}" type="${type}" autocomplete="${autocomplete}" maxlength="${max}" placeholder="${escape(t.whitelist[`${key}Placeholder`])}" aria-describedby="whitelist-status whitelist-privacy"></div>`
  ).join("");
  const demoData = JSON.stringify(t.demo).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(t.meta.title)}</title><meta name="description" content="${escape(t.meta.description)}">
<meta name="theme-color" content="#176BFF"><meta name="color-scheme" content="light">
<link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="en" href="${new URL(route("en"), origin).href}"><link rel="alternate" hreflang="es" href="${new URL(route("es"), origin).href}"><link rel="alternate" hreflang="x-default" href="${new URL(route("en"), origin).href}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Movya Wallet"><meta property="og:title" content="${escape(t.meta.title)}"><meta property="og:description" content="${escape(t.meta.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${social}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${escape(t.footer.line)}"><meta property="og:locale" content="${lang === "es" ? "es_ES" : "en_US"}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(t.meta.title)}"><meta name="twitter:description" content="${escape(t.meta.description)}"><meta name="twitter:image" content="${social}">
<link rel="icon" href="${assets}favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="${assets}apple-touch-icon.png">
<link rel="preload" href="${assets}manrope-extrabold.woff" as="font" type="font/woff" crossorigin><link rel="stylesheet" href="${base}/styles.css">
<script type="application/ld+json">${JSON.stringify(structured).replaceAll("<", "\\u003c")}</script>
<script id="demo-copy" type="application/json">${demoData}</script>
<script id="whitelist-copy" type="application/json">${JSON.stringify(t.whitelist).replaceAll("<", "\\u003c")}</script>
<script type="module" src="${base}/app.js"></script>
</head>
<body id="top">
<a class="skip-link" href="#main">${t.skip}</a>
<header class="site-header"><div class="container header-inner">
${brand(assets)}
<button class="menu-toggle" type="button" aria-controls="main-nav" aria-expanded="false" aria-label="${t.menu}" data-open-label="${t.menu}" data-close-label="${t.closeMenu}">${icon("menu")}</button>
<nav class="main-nav" id="main-nav" aria-label="${lang === "es" ? "Principal" : "Main"}"><a href="#wallet">${t.nav[0]}</a><a href="#demo">${t.nav[1]}</a><a href="#faq">${t.nav[2]}</a><a class="nav-whitelist" href="#whitelist">${t.nav[3]}${icon("up")}</a></nav>
<div class="header-end"><div class="language-switch" role="group" aria-label="${t.language}"><a href="${route("en")}" lang="en" hreflang="en" aria-label="English" ${lang === "en" ? 'aria-current="page"' : ""}>EN</a><a href="${route("es")}" lang="es" hreflang="es" aria-label="Español" ${lang === "es" ? 'aria-current="page"' : ""}>ES</a></div><a class="button button-small button-blue header-cta" href="#whitelist">${t.join}${icon("arrow")}</a></div>
<span class="header-progress" aria-hidden="true"></span></div></header>
<main id="main">
<section class="hero container" aria-labelledby="hero-title"><div class="hero-copy"><div class="eyebrow"><span class="little-mark">✦</span>${t.eyebrow}</div>
<h1 id="hero-title">${t.hero[0]}<br><span>${t.hero[1]}</span></h1>
<p class="hero-intro">${t.intro}</p>
<div class="hero-actions"><a class="button button-blue" href="#demo">${t.primary}${icon("arrow")}</a><a class="text-link" href="#whitelist">${t.join}${icon("up")}</a></div>
<p class="stage-label"><span class="status-dot"></span>${t.stage}</p>
<div class="hero-tags">${t.heroTags.map((x) => `<span>${icon("check")}${x}</span>`).join("")}</div>
</div>
<div class="hero-visual"><div class="visual-orbit orbit-one"></div><div class="visual-orbit orbit-two"></div><span class="sparkle sparkle-one">✦</span><span class="sparkle sparkle-two">✧</span>
<div class="phone" role="img" aria-label="${escape(t.ui.note)}"><div class="phone-hardware"><span>9:41</span><span class="phone-island"></span><span>● ▰</span></div><div class="phone-app">
<div class="app-header"><span class="user-avatar">A</span><div><strong>${t.ui.hello}</strong><small>${t.ui.welcome}</small></div><span class="app-icon">${icon("spark")}</span></div>
<div class="balance-card"><div class="card-top"><span class="card-brand"><img src="${assets}movya-logo.png" width="24" height="24" alt="">Movya</span><span class="card-badge">${t.ui.demo}</span></div><small>${t.ui.total}</small><strong class="balance">$1,629.24<span>USD</span></strong><div class="card-bottom"><span>${t.ui.personal}</span><span>•••• 0428</span></div></div>
<div class="quick-actions"><div><span>${icon("up")}</span>${t.ui.send}</div><div><span>${icon("receive")}</span>${t.ui.receive}</div><div><span>${icon("plus")}</span>USDC</div></div>
<div class="phone-section-title">${t.ui.portfolio}<span>···</span></div><div class="phone-assets">${asset(assets, "USDC", "USD Coin", "1,500.00")}${asset(assets, "XLM", "Stellar", "500.00")}</div>
<div class="phone-nav"><span>${icon("home")}<small>${t.ui.home}</small></span><span>${icon("people")}<small>${t.ui.contacts}</small></span><span class="phone-movya"><img src="${assets}movya-logo.png" width="44" height="44" alt="Movya"></span><span>${icon("activity")}<small>${t.ui.activity.split(" ")[0]}</small></span><span>${icon("account")}<small>${t.ui.account}</small></span></div>
</div></div>
<div class="floating-chat"><div class="float-identity">${mascot(assets, 44)}<div><strong>Movya</strong><small>${t.ui.assistant}</small></div><span class="ai-pill">${lang === "es" ? "IA" : "AI"}</span></div><div class="mini-user">${t.ui.prompt}</div><div class="mini-reply">${icon("shield")}<span>${t.ui.review}</span><span class="mini-check">${icon("check")}</span></div></div>
<div class="visual-caption">${t.ui.note}</div>
</div></section>
<section class="stellar-strip"><div class="container stellar-inner"><img src="${assets}stellar-wordmark.png" width="139" height="36" alt="Stellar"><div><p>${t.stellar[0]} <strong>${t.stellar[1]}</strong></p><span>${t.stellarText}</span></div><div class="network-symbol" aria-hidden="true">↗</div></div></section>
<section class="product section container" id="wallet" aria-labelledby="wallet-title"><div class="section-heading"><span class="eyebrow">${t.product.label}</span><h2 id="wallet-title">${br(t.product.title)}</h2><p>${t.product.text}</p></div>
<div class="feature-grid">${t.product.features.map((f, i) => `<article class="feature"><span class="feature-number">0${i + 1}</span><span class="feature-icon">${icon(f.icon)}</span><h3>${f.title}</h3><p>${f.text}</p></article>`).join("")}</div>
<div class="human-panel"><div class="human-copy"><span class="eyebrow">${t.product.miniLabel}</span><h3>${br(t.product.miniTitle)}</h3><p>${t.product.miniText}</p><span class="inline-network"><span class="status-dot"></span>${t.product.network}</span></div><div class="human-art"><span class="art-ring"></span><div class="contact-card"><div class="contact-title">${t.product.cardLabel}${icon("people")}</div><div class="contact-person"><span class="contact-avatar">O</span><span><strong>Ouali</strong><small>${t.product.contactHint}</small></span><span class="contact-check">${icon("check")}</span></div><div class="contact-cta">${t.product.contactAction}${icon("arrow")}</div></div><div class="assistant-chip"><img src="${assets}movya-logo.png" width="36" height="36" alt="">${t.ui.float}</div></div></div>
</section>
<section class="demo-section section" id="demo" aria-labelledby="demo-title"><div class="container demo-layout"><div class="demo-intro"><span class="eyebrow">${t.how.label}</span><h2 id="demo-title">${br(t.how.title)}</h2><p class="section-text">${t.how.text}</p><ol class="steps">${t.how.steps.map(([a, b], i) => `<li><span class="step-number">0${i + 1}</span><div><h3>${a}</h3><p>${b}</p></div></li>`).join("")}</ol></div>
<div class="chat-demo"><div class="demo-chat-header">${mascot(assets, 60)}<div><h3>${t.demo.title}</h3><p><span class="status-dot"></span>${t.demo.subtitle}</p></div><button class="reset-demo" id="reset-demo" type="button" aria-label="${t.demo.reset}" title="${t.demo.reset}">${icon("refresh")}</button></div>
<div class="chat-stream" id="chat-stream" role="log" aria-label="${t.demo.label}" aria-live="polite" aria-relevant="additions"><div class="chat-date">${t.demo.label}</div><div class="chat-message assistant"><span class="message-name">Movya <span>✦</span></span><div class="message-bubble">${t.demo.greet}</div></div></div>
<div class="demo-suggestions" id="demo-suggestions">${t.demo.suggestions.map((x, i) => `<button type="button" data-suggestion="${i}">${i === 0 ? icon("spark") : ""}${x}${icon("up")}</button>`).join("")}</div>
<form class="demo-composer" id="demo-form"><label class="sr-only" for="demo-input">${t.demo.input}</label><input id="demo-input" type="text" name="message" maxlength="160" placeholder="${escape(t.demo.placeholder)}" autocomplete="off" enterkeyhint="send" required><button type="submit" aria-label="${t.demo.submit}">${icon("send")}</button></form><p class="demo-notice">${icon("shield")}${t.demo.notice}</p>
<noscript><p class="noscript-note">${lang === "es" ? "Activa JavaScript para probar la demo interactiva." : "Enable JavaScript to try the interactive demo."}</p></noscript>
</div></div></section>
<section class="control-section section" aria-labelledby="control-title"><div class="container control-layout"><div class="control-copy"><span class="eyebrow">${t.control.label}</span><h2 id="control-title">${br(t.control.title)}</h2><p class="section-text">${t.control.text}</p><div class="control-points">${t.control.points.map(([a, b], i) => `<div><span>${icon(["shield", "wallet", "activity"][i])}</span><section><h3>${a}</h3><p>${b}</p></section></div>`).join("")}</div></div><div class="approval-art"><div class="approval-backdrop"></div><div class="approval-card"><span class="approval-icon">${icon("shield")}</span><span class="eyebrow">${t.control.status}</span><h3>${t.control.receipt}</h3><div class="approval-amount">20.00 <span>USDC</span></div><div class="approval-person"><span class="contact-avatar">O</span><div><small>${t.demo.to}</small><strong>Ouali</strong></div><span class="contact-check">${icon("check")}</span></div><p>${t.control.receiptNote}</p><span class="approval-button">${icon("check")}${t.control.receiptAction}</span></div><span class="approval-caption">${icon("shield")}${t.ui.review}</span></div></div></section>
<section class="faq-section section container" id="faq" aria-labelledby="faq-title"><div><span class="eyebrow">${t.faq.label}</span><h2 id="faq-title">${br(t.faq.title)}</h2></div><div class="faq-list">${t.faq.items.map(([q, a], i) => `<details ${i === 0 ? "open" : ""}><summary>${q}<span>${icon("plus")}</span></summary><div class="faq-answer"><p>${a}</p></div></details>`).join("")}</div></section>
<section class="whitelist-section container" id="whitelist" aria-labelledby="whitelist-title"><div class="whitelist-inner"><div class="whitelist-copy"><span class="eyebrow">${t.whitelist.label}</span><h2 id="whitelist-title">${br(t.whitelist.title)}</h2><p>${t.whitelist.text}</p><div class="whitelist-mascot">${mascot(assets, 144)}<span>${t.whitelist.tag}</span><span class="whitelist-spark" aria-hidden="true">✦</span></div></div><div class="whitelist-card"><span class="whitelist-card-icon">${icon("chat")}</span><h3>${t.whitelist.formTitle}</h3><p class="whitelist-card-intro">${t.whitelist.formText}</p><form id="whitelist-form" action="${base}/api/whitelist" method="post" aria-label="${t.whitelist.formLabel}" novalidate><label for="whitelist-email">${t.whitelist.email}</label><div class="whitelist-email-wrap">${icon("send")}<input id="whitelist-email" type="email" name="email" autocomplete="email" inputmode="email" maxlength="254" placeholder="${escape(t.whitelist.placeholder)}" aria-describedby="whitelist-status whitelist-privacy" required></div><div class="whitelist-details">${optionalDetails}</div><div class="whitelist-honeypot" aria-hidden="true"><label for="whitelist-website">${t.whitelist.website}</label><input id="whitelist-website" type="text" name="website" tabindex="-1" autocomplete="off"></div><label class="whitelist-consent" for="whitelist-consent"><input id="whitelist-consent" type="checkbox" name="consent" required><span>${t.whitelist.consent}</span></label><button class="button button-blue whitelist-submit" type="submit" disabled><span>${t.whitelist.submit}</span>${icon("arrow")}</button><p id="whitelist-status" class="whitelist-status" role="status" aria-live="polite" aria-atomic="true"></p><p class="whitelist-hint">${icon("shield")}${t.whitelist.hint}</p></form><div id="whitelist-success" class="whitelist-success" hidden tabindex="-1"><span>${icon("check")}</span><h4>${t.whitelist.successTitle}</h4><p>${t.whitelist.success}</p></div><p class="whitelist-privacy" id="whitelist-privacy">${t.whitelist.privacy}</p><noscript><p class="noscript-note">${t.whitelist.noScript}</p></noscript></div></div></section>
</main>
<footer class="site-footer"><div class="container"><div class="footer-top"><div>${brand(assets)}<p class="footer-line">${t.footer.line}</p></div><div class="footer-links"><div><h3>${t.footer.product}</h3><a href="#wallet">${t.nav[0]}</a><a href="#demo">${t.nav[1]}</a><a href="#faq">${t.nav[2]}</a></div><div><h3>${t.footer.connect}</h3><a href="https://www.instagram.com/movya_wallet/" target="_blank" rel="noopener noreferrer">${icon("instagram")}${t.footer.instagram}${icon("up")}</a><a href="#whitelist">${icon("chat")}${t.nav[3]}${icon("up")}</a></div></div></div><div class="footer-bottom"><span>© ${new Date().getUTCFullYear()} ${t.footer.copyright}</span><span class="footer-stage"><span class="status-dot"></span>${t.footer.status}</span><a href="#top">${t.footer.top}${icon("up")}</a></div></div></footer>
</body></html>`;
}
