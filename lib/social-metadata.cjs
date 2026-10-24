'use strict';
const ORIGIN = 'https://adastra.global';
const IMAGE = ORIGIN + '/assets/social-card.jpg';
const START = '<!-- AD ASTRA social metadata -->';
const END = '<!-- /AD ASTRA social metadata -->';
function renderSocial(html) {
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  if (!title || !description || !canonical || new URL(canonical).origin !== ORIGIN) {
    throw Error('Social metadata requires a title, description and canonical AD ASTRA URL');
  }
  // Values come from already escaped HTML fields; do not double-escape entities.
  const properties = {
    'og:type': 'website', 'og:site_name': 'AD ASTRA', 'og:locale': 'en_US',
    'og:title': title, 'og:description': description, 'og:url': canonical,
    'og:image': IMAGE, 'og:image:secure_url': IMAGE, 'og:image:type': 'image/jpeg',
    'og:image:width': '1200', 'og:image:height': '630',
    'og:image:alt': 'AD ASTRA — human-directed intelligence for Earth, Space and Beyond.'
  };
  const names = {
    'twitter:card': 'summary_large_image', 'twitter:title': title,
    'twitter:description': description, 'twitter:image': IMAGE,
    'twitter:image:alt': properties['og:image:alt']
  };
  const block = START + Object.entries(properties).map(([key,value]) => `<meta property="${key}" content="${value}">`).join('')
    + Object.entries(names).map(([key,value]) => `<meta name="${key}" content="${value}">`).join('') + END;
  const clean = html.replace(/<!-- AD ASTRA social metadata -->[\s\S]*?<!-- \/AD ASTRA social metadata -->/g, '');
  if (!clean.includes('</head>')) throw Error('Social metadata requires an HTML head');
  return clean.replace('</head>', block + '</head>');
}
module.exports = {renderSocial, IMAGE};
