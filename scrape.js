import puppeteer from "puppeteer";
import fs from "fs";

(async () => {
  let browser;
  try {
    console.log("Launching browser with ALL arguments...");
    browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium-browser",
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-zygote',
        '--single-process', // Sometimes helps in constrained environments
        '--disable-features=IsolateOrigins,site-per-process',
        '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      ],
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);

    // --- NEW DEBUGGING STEP ---
    console.log("--- Starting Environment Render Test ---");
    const simpleHtml = '<html><body><h1>Hello, World!</h1><p>This is a render test.</p></body></html>';
    await page.setContent(simpleHtml, { waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: 'render-test.png' });
    console.log("✅ Render test complete. Check 'render-test.png'.");
    // ----------------------------

    console.log("Navigating to Twitch directory...");
    await page.goto("https://www.twitch.tv/directory/all?filter=live&dropsEnabled=true", {
      waitUntil: "networkidle2",
    });

    console.log("Taking initial screenshot of Twitch page...");
    await page.screenshot({ path: "twitch_initial_load.png" });

    // The rest of your script continues here...
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
        // ... evaluate logic remains the same
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
          } catch (e) {}
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
