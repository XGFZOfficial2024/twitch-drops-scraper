
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

    // Wait for the main container that holds stream cards
    await page.waitForSelector('[data-a-target="card-wrapper"]', { timeout: 15000 });

    const data = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('a[data-a-target="preview-card-image-link"]'));
      return cards.map(card => {
        const name = card.href.split("/").pop();

        // Look for container div that has game and viewers info
        const cardDiv = card.closest('div[data-a-target="card-wrapper"]') || card.closest('div[data-a-target="preview-card"]');
        if (!cardDiv) {
          console.warn("No container div for card:", name);
          return null;
        }

        const gameElem = cardDiv.querySelector('p[data-a-target="preview-card-game-link"]');
        const game = gameElem ? gameElem.textContent.trim() : "Unknown";

        const viewersElem = cardDiv.querySelector('[data-a-target="preview-card-viewer-count"]');
        const viewers = viewersElem ? viewersElem.textContent.trim() : "0";

        return { name, game, viewers };
      }).filter(Boolean);
    });

    await browser.close();

    fs.writeFileSync("drops.json", JSON.stringify(data, null, 2));
    console.log("Scraped", data.length, "streams with drops enabled.");

  } catch (error) {
    console.error("Scraper failed:", error);
    process.exit(1);
  }
})();
