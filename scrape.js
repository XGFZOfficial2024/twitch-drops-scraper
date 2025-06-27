import puppeteer from "puppeteer";
import fs from "fs";

(async () => {
  try {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium-browser",
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    console.log("Navigating to Twitch directory...");
    await page.goto("https://www.twitch.tv/directory/all?filter=live&dropsEnabled=true", {
      waitUntil: "domcontentloaded"
    });

    // A more reliable way to wait for content to load
    console.log("Waiting for stream cards to appear...");
    await page.waitForSelector('div.tw-tower > div[data-target="directory-page-body"] article', { timeout: 20000 });

    // Optional: A brief additional wait for good measure, though waitForSelector is preferred
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("Extracting data from the page...");
    const data = await page.evaluate(() => {
      const results = [];
      // Use a more stable parent selector for the stream cards
      const cards = Array.from(document.querySelectorAll('div.tw-tower > div[data-target="directory-page-body"] article'));

      for (const card of cards) {
        try {
          const linkElement = card.querySelector('a[data-a-target="preview-card-image-link"]');
          if (!linkElement) continue;

          const name = linkElement.href.split("/").pop();

          // Updated selectors for game and viewers
          const gameElement = card.querySelector('p > a[data-a-target="preview-card-game-link"]');
          const viewersElement = card.querySelector('div[data-a-target="preview-card-stats"] > div:first-of-type > p');

          const game = gameElement ? gameElement.textContent.trim() : "Unknown";
          const viewers = viewersElement ? viewersElement.textContent.trim() : "0";

          results.push({ name, game, viewers });
        } catch (e) {
          // It's often better to log the error to see why a card might fail
          console.error("Error processing a card:", e);
          continue;
        }
      }

      return results;
    });

    console.log("Closing browser...");
    await browser.close();

    fs.writeFileSync("drops.json", JSON.stringify(data, null, 2));
    console.log("✅ Scraped", data.length, "streams with drops enabled.");
  } catch (error) {
    console.error("❌ Scraper failed:", error);
    process.exit(1);
  }
})();
