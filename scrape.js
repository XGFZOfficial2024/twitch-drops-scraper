import puppeteer from "puppeteer";
import fs from "fs";

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto("https://www.twitch.tv/directory/all?filter=live&dropsEnabled=true", {
    waitUntil: "networkidle2"
  });

  const data = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('a[data-a-target="preview-card-image-link"]'));
    return cards.map(card => {
      const name = card.href.split("/").pop();
      const game = card.closest('div[data-a-target="preview-card"]').querySelector('p[data-a-target="preview-card-game-link"]')?.textContent ?? "Unknown";
      const viewers = card.closest('div[data-a-target="preview-card"]').querySelector('[data-a-target="preview-card-viewer-count"]')?.textContent ?? "0";
      return { name, game, viewers };
    });
  });

  await browser.close();
  fs.writeFileSync("drops.json", JSON.stringify(data, null, 2));
  console.log("Scraped", data.length, "streams with drops enabled.");
})();
