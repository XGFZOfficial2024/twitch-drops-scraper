import puppeteer from "puppeteer";
import fs from "fs";

(async () => {
  try {
    const browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium-browser",
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.goto("https://www.twitch.tv/directory/all?filter=live&dropsEnabled=true", {
      waitUntil: "networkidle2"
    });

    // Wait for any stream cards to show up
    await page.waitForSelector('[data-a-target="preview-card-image-link"]', { timeout: 15000 });

    const data = await page.evaluate(() => {
      const results = [];
      const cards = Array.from(document.querySelectorAll('a[data-a-target="preview-card-image-link"]'));

      for (const card of cards) {
        try {
          const name = card.href.split("/").pop();
          const cardDiv = card.closest('div[data-a-target="card-wrapper"]') || card.closest('div[data-a-target="preview-card"]');

          if (!cardDiv) continue;

          const gameElem = cardDiv.querySelector('p[data-a-target="preview-card-game-link"]');
          const viewersElem = cardDiv.querySelector('[data-a-target="preview-card-viewer-count"]');

          const game = gameElem ? gameElem.textContent.trim() : "Unknown";
          const viewers = viewersElem ? viewersElem.textContent.trim() : "0";

          results.push({ name, game, viewers });
        } catch (e) {
          // Just skip this card and keep going
          continue;
        }
      }

      return results;
    });

    await browser.close();

    fs.writeFileSync("drops.json", JSON.stringify(data, null, 2));
    console.log("✅ Scraped", data.length, "streams with drops enabled.");
  } catch (error) {
    console.error("❌ Scraper failed:", error);
    process.exit(1);
  }
})();
