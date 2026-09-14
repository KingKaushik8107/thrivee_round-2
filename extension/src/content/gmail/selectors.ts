/**
 * PhishX Browser Extension — Gmail Selectors & Strategy Definitions
 * 
 * Resilient multi-tier selector fallbacks for Gmail SPA DOM extraction.
 * Avoids single brittle selectors by supporting multiple semantic attributes,
 * ARIA descriptors, and structural hierarchy fallbacks.
 */

export const GMAIL_SELECTORS = {
  // Main email view / thread containers
  THREAD_CONTAINERS: [
    'div[role="main"] .adn.ads',
    'div[role="main"] .h7',
    'div[role="main"] [data-message-id]',
    'div[role="main"] div[data-legacy-message-id]',
    'div[role="main"] .Bk',
    '.nH.hx',
    'div[role="main"] .gE.iv.gt'
  ],

  // Specific message containers within a thread
  MESSAGE_CONTAINER: [
    '.adn.ads',
    '.adn',
    '.h7',
    '[data-message-id]',
    '.Bk'
  ],

  // Sender selectors (ordered by specificity)
  SENDER: [
    'span[email]',
    '[data-hovercard-id]',
    'span.gD',
    'span.go',
    '.gE.iv.gt span[email]',
    '.adn .gD',
    'span[data-hovercard-id]',
    '[aria-label*="@"]'
  ],

  // Subject selectors
  SUBJECT: [
    'h2.hP',
    'h2[data-thread-perm-id]',
    'div[role="main"] h2.hP',
    'div[role="main"] h2',
    'h1.ha',
    'h2[role="heading"]'
  ],

  // Body content containers (strictly within message scope)
  BODY: [
    '.ii.gt .a3s.aiL',
    '.ii.gt',
    '.a3s.aiL',
    '.adn .a3s',
    'div[dir="ltr"].a3s',
    '.adP'
  ],

  // Header area where date/sender metadata lives
  HEADER_AREA: [
    '.gE.iv.gt',
    '.adn .gH',
    '.gH',
    '.ajz'
  ],

  // Ignored / UI elements that must NEVER be extracted as email body
  EXCLUDED_ELEMENTS: [
    '[role="navigation"]',
    '[role="banner"]',
    '[role="toolbar"]',
    '.nH.oy8Mbf',
    '.G-atb',
    '.brC-aT5-aOT-Jw',
    '.ajl',
    '.gU.Up',
    '.hx .gE.iv.gt'
  ]
};

// URL domains that belong to internal Gmail/Google UI and must NOT be classified as email links
export const INTERNAL_GOOGLE_DOMAINS = [
  'mail.google.com',
  'support.google.com',
  'accounts.google.com',
  'myaccount.google.com',
  'policies.google.com',
  'workspace.google.com',
  'contacts.google.com',
  'calendar.google.com',
  'drive.google.com',
  'hangouts.google.com',
  'chat.google.com',
  'meet.google.com'
];
