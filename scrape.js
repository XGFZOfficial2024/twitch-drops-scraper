import puppeteer from "puppeteer";
import fs from "fs";

(async () => {
  let browser;
  try {
    console.log("Launching browser with robust arguments...");
    browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium-browser",
      headless: "new",
      // --- CRITICAL NEW ARGUMENTS ---
      // These flags are essential for running in a containerized/CI-CD environment
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-infobars",
        "--window-position=0,0",
        "--ignore-certifcate-errors",
        "--ignore-certifcate-errors-spki-list",
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
        // The following are crucial for preventing the white screen issue
        "--disable-gpu", // Disables GPU hardware acceleration
        "--disable-dev-shm-usage", // Overcomes limited resource problems
        "--no-zygote", // Disables the zygote process for forking child processes in Linux
      ],
      // -----------------------------
    });

    const page = await browser.newPage();

    // Set a longer default timeout for all page operations
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);

    console.log("Navigating to Twitch directory...");
    await page.goto(
      "https://www.twitch.tv/directory/all?filter=live&dropsEnabled=true",
      {
        waitUntil: "networkidle2",
      }
    );

    // After navigation, let's see what the page looks like *before* we wait
    console.log("Initial page loaded. Taking a preliminary screenshot.");
    await page.screenshot({ path: "pre-wait_screenshot.png" });

    try {
      console.log("Looking for cookie consent button...");
      const cookieButtonSelector = 'button[data-a-target="consent-banner-accept"]';
      await page.waitForSelector(cookieButtonSelector, { timeout: 7000, visible: true });
      await page.click(cookieButtonSelector);
      console.log("Cookie consent accepted.");
    } catch (e) {
      console.log("Cookie consent banner not found or failed to click, continuing...");
    }

    console.log("Waiting for stream cards container to appear...");
    const mainContentSelector = 'main.tw-flex-grow-1';
    await page.waitForSelector(mainContentSelector);

    console.log("Waiting for at least one stream card to render...");
    const firstCardSelector = 'a[data-a-target="preview-card-image-link"]';
    await page.waitForSelector(firstCardSelector);

    console.log("Extracting data from the page...");
    const data = await page.evaluate(() => {
      const results = [];
      const streamArticles = document.querySelectorAll("div.Layout-relative.qa-tower-preview-card");

      for (const article of streamArticles) {
        try {
          const linkElement = article.querySelector('a[data-a-target="preview-card-image-link"]');
          if (!linkElement) continue;

          const streamerName = linkElement.href.split("/").pop();
          const gameElement = article.querySelector('a[data-a-target="preview-card-game-link"]');
          const viewersElement = article.querySelector('div[data-a-target="preview-card-stats"] > div:first-of-type > p');

          const game = gameElement ? gameElement.textContent.trim() : "Unknown";
          const viewers = viewersElement ? viewersElement.textContent.trim() : "0";

          if (streamerName && streamerName !== "null") {
            results.push({ name: streamerName, game, viewers });
          }
        } catch (e) {
          // This allows the loop to continue even if one card has a weird structure
        }
      }
      return results;
    });

    if (browser) await browser.close();
    browser = null;

    fs.writeFileSync("drops.json", JSON.stringify(data, null, 2));

    if (data.length > 0) {
      console.log(`✅ Successfully scraped ${data.length} streams with drops enabled.`);
    } else {
      console.warn("⚠️ Scraper finished, but no data was extracted. The website layout may have changed or no streams with drops are live.");
    }

  } catch (error) {
    console.error("❌ Scraper failed:", error);
    if (browser) {
      const page = (await browser.pages())[0];
      await page.screenshot({ path: "error_screenshot.png" });
      console.log("📸 Screenshot of the error page has been saved to 'error_screenshot.png'.");
      await browser.close();
    }
    process.exit(1);
  }
})();
