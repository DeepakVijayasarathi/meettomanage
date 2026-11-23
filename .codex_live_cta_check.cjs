const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 760 } });
  await page.goto("https://meettomanage.cloud/?cta-check=final", { waitUntil: "networkidle" });
  await page.waitForSelector('button[aria-label="Ask a question"]', { timeout: 10000 });
  const result = await page.evaluate(() => {
    const chat = document.querySelector('button[aria-label="Ask a question"]')?.parentElement?.getBoundingClientRect();
    const whatsapp = document.querySelector('a[aria-label="Chat with Meet to Manage on WhatsApp"]');
    const bar = whatsapp?.closest(".fixed")?.getBoundingClientRect();
    return { chat: chat?.toJSON(), bar: bar?.toJSON(), overlap: !!chat && !!bar && chat.bottom > bar.top, width: document.documentElement.scrollWidth };
  });
  console.log(JSON.stringify(result));
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
