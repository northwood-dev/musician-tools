const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function testGenius() {
  const title = 'Killing in the name';
  const artist = 'Rage Against The Machine';
  
  // Build URL like the service does
  const artistSlug = artist
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const songSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const artistCapitalized = artistSlug.charAt(0).toUpperCase() + artistSlug.slice(1);
  const url = `https://genius.com/${artistCapitalized}-${songSlug}-lyrics`;
  
  console.log('Fetching URL:', url);
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml'
    }
  });
  
  console.log('Status:', res.status);
  
  if (!res.ok) {
    console.log('Failed!');
    return;
  }
  
  const html = await res.text();
  console.log('HTML length:', html.length);
  
  const $ = cheerio.load(html);
  
  // Test album selector
  const albumLink = $('a[href="#primary-album"]').first();
  console.log('\nAlbum link found:', albumLink.length > 0);
  if (albumLink.length > 0) {
    console.log('Album raw HTML:', albumLink.html().slice(0, 200));
    console.log('Album text:', albumLink.text());
  } else {
    console.log('\nTrying alternate selector a[href*="/albums/"]...');
    const altLink = $('a[href*="/albums/"]').first();
    console.log('Alt link found:', altLink.length > 0);
    if (altLink.length > 0) {
      console.log('Alt link HTML:', altLink.html().slice(0, 200));
    }
  }
  
  // Test tags
  const tags = [];
  $('a[href*="/tags/"]').each((_, link) => {
    tags.push($(link).text().trim());
  });
  console.log('\nTags found:', tags.slice(0, 10));
}

testGenius().catch(console.error);
