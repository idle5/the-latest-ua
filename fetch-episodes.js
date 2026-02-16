#!/usr/bin/env node
/**
 * fetch-episodes.js
 * Fetches the Ukrainian RSS feed from Acast directly (no CORS needed in Node),
 * parses all episodes since Dec 17, 2025, and writes episodes.json.
 *
 * Usage: node fetch-episodes.js
 *
 * Run this locally or in CI (e.g., GitHub Actions cron) to keep episodes.json updated.
 */

const RSS_URL = 'https://feeds.acast.com/public/shows/67a60b513ef0b176eae6a5d0';
const FIRST_UA_DATE = new Date('2025-12-17T00:00:00Z');
const OUTPUT_FILE = 'episodes.json';

async function main() {
    console.log('Fetching Ukrainian RSS feed...');
    const res = await fetch(RSS_URL);
    if (!res.ok) {
        console.error(`HTTP ${res.status}: ${res.statusText}`);
        process.exit(1);
    }

    const xml = await res.text();
    console.log(`Received ${(xml.length / 1024).toFixed(0)} KB of XML`);

    // Simple XML parsing using regex (avoids external dependencies)
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1];

        const title = extractTag(itemXml, 'title');
        const pubDate = extractTag(itemXml, 'pubDate');
        const guid = extractTag(itemXml, 'guid');
        const duration = extractTag(itemXml, 'itunes:duration');

        // Extract description (try multiple tags)
        let description = extractTag(itemXml, 'description');
        if (!description) description = extractTag(itemXml, 'itunes:summary');
        if (!description) description = extractTag(itemXml, 'content:encoded');

        // Enclosure URL
        const encMatch = itemXml.match(/<enclosure[^>]+url="([^"]+)"/);
        const audioUrl = encMatch ? encMatch[1] : '';

        // Episode image
        const imgMatch = itemXml.match(/<itunes:image[^>]+href="([^"]+)"/);
        const thumbnail = imgMatch ? imgMatch[1] : '';

        const date = new Date(pubDate);
        if (isNaN(date) || date < FIRST_UA_DATE) continue;

        items.push({
            title: cleanCDATA(title),
            description: cleanCDATA(description).replace(/<[^>]*>/g, '').substring(0, 500), // Clean HTML and limit length
            pubDate,
            guid: cleanCDATA(guid),
            duration,
            enclosure: { link: audioUrl },
            thumbnail,
        });
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    const fs = require('fs');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(items, null, 2));
    console.log(`Wrote ${items.length} episodes to ${OUTPUT_FILE}`);
}

function extractTag(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
    const m = xml.match(regex);
    return m ? m[1].trim() : '';
}

function cleanCDATA(text) {
    return text.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
