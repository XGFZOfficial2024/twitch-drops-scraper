import puppeteer from "puppeteer";
import fs from "fs";

(async () => {
  try {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium-browser",
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--window-size=1920,1080", // Setting a common window size can help
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
    );

    console.log("Navigating to Twitch directory...");
    await page.goto(
      "https://www.twitch.tv/directory/all?filter=live&dropsEnabled=true",
      {
        waitUntil: "networkidle2", // Wait for network to be mostly idle
      }
    );

    // --- NEW: Handle Cookie Consent ---
    try {
      console.log("Looking for cookie consent button...");
      // This selector targets the "Accept" button in the cookie dialog
      const cookieButtonSelector = 'button[data-a-target="consent-banner-accept"]';
      await page.waitForSelector(cookieButtonSelector, { timeout: 5000 });
      await page.click(cookieButtonSelector);
      console.log("Cookie consent accepted.");
    } catch (e) {
      console.log("Cookie consent banner not found, continuing...");
    }
    // ------------------------------------

    console.log("Waiting for stream cards to appear...");
    // --- UPDATED AND SIMPLIFIED SELECTOR ---
    // This selector is more generic and targets the container of the stream cards
    const cardContainerSelector = 'div[data-target="directory-page-body"] .tw-tower';
    await page.waitForSelector(cardContainerSelector, { timeout: 20000 });
    // ------------------------------------

    console.log("Extracting data from the page...");
    const data = await page.evaluate(() => {
      const results = [];
      // --- UPDATED SELECTOR for individual cards ---
      const cards = Array.from(
        document.querySelectorAll('div[data-target="directory-page-body"] .tw-tower > div')
      );

      for (const card of cards) {
        try {
          const linkElement = card.querySelector('a[data-a-target="preview-card-image-link"]');
          if (!linkElement) continue;

          const streamerName = linkElement.href.split("/").pop();

          const gameElement = card.querySelector('a[data-a-target="preview-card-game-link"]');
          // A more robust way to get viewers, looking for the specific element inside the stats container
          const viewersElement = card.querySelector('div[data-a-target="preview-card-stats"] span');

          const game = gameElement ? gameElement.textContent.trim() : "Unknown";
          const viewers = viewersElement ? viewersElement.textContent.trim() : "0";

          if (streamerName) { // Ensure we only add valid entries
            results.push({ name: streamerName, game, viewers });
          }
        } catch (e) {
          console.error("Error processing a card:", e);
        }
      }

      return results;
    });

    console.log("Closing browser...");
    await browser.close();

    fs.writeFileSync("drops.json", JSON.stringify(data, null, 2));

    if (data.length > 0) {
      console.log(`✅ Successfully scraped ${data.length} streams with drops enabled.`);
    } else {
      console.warn("⚠️ Scraper finished, but no data was extracted. The website layout may have changed.");
    }

  } catch (error) {
    console.error("❌ Scraper failed:", error);
    process.exit(1);
  }
})();
