import puppeteer from "puppeteer";
import fs from "fs";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  await page.goto("https://www.twitch.tv/directory/all?filter=live&dropsEnabled=true", {
    waitUntil: "networkidle2"
  });

  // Wait for stream cards container to load
  await page.waitForSelector('div[data-target="directory-first-item"]', { timeout: 10000 }).catch(() => {
    console.log("Stream cards container not found");
  });

  const data = await page.evaluate(() => {
    // Select all stream cards — these appear as links with data-a-target attributes
    const cards = Array.from(document.querySelectorAll('a[data-a-target="preview-card-image-link"]'));
    return cards.map(card => {
      const name = card.href.split("/").pop();

      // Find the card container div closest to this link
      const cardDiv = card.closest('div[data-a-target="directory-first-item"]') || card.closest('div[data-a-target="preview-card"]');

      const gameElem = cardDiv?.querySelector('p[data-a-target="preview-card-game-link"]');
      const game = gameElem ? gameElem.textContent.trim() : "Unknown";

      const viewersElem = cardDiv?.querySelector('[data-a-target="preview-card-viewer-count"]');
      const viewers = viewersElem ? viewersElem.textContent.trim() : "0";

      return { name, game, viewers };
    });
  });

  await browser.close();

  fs.writeFileSync("drops.json", JSON.stringify(data, null, 2));
  console.log("Scraped", data.length, "streams with drops enabled.");
})();
