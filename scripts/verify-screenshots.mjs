import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const OUT_DIR = 'C:\\DSH_work\\插件开发\\omp-claude-desktop\\screenshots';

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Claude Studio Home Light
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto('http://127.0.0.1:5188/?palette=claude&scheme=light&layout=studio&mascot=crab', {
        waitUntil: 'networkidle',
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: join(OUT_DIR, '01-claude-home-light.png') });
      await page.close();
    }

    // 2. Claude Studio Home Dark
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto('http://127.0.0.1:5188/?palette=claude&scheme=dark&layout=studio&mascot=crab', {
        waitUntil: 'networkidle',
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: join(OUT_DIR, '02-claude-home-dark.png') });
      await page.close();
    }

    // 3. Claude Conversation Light (Markdown rendering tour)
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      await page.goto(
        'http://127.0.0.1:5188/?palette=claude&scheme=light&session=session-markdown-tour&mascot=crab',
        { waitUntil: 'networkidle' }
      );
      await page.waitForTimeout(700);
      await page.screenshot({ path: join(OUT_DIR, '03-claude-conversation-light.png') });
      await page.close();
    }

    // 4. Claude Conversation Dark + Context Popover & Effort Dot Matrix
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      await page.goto(
        'http://127.0.0.1:5188/?palette=claude&scheme=dark&session=session-markdown-tour&mascot=crab',
        { waitUntil: 'networkidle' }
      );
      await page.waitForTimeout(700);
      // Click effort trigger to show 5-row dot matrix
      await page.click('.dsh-claude-effort-trigger');
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(OUT_DIR, '04-claude-conversation-dark.png') });
      await page.close();
    }

    // 5. DeepSeek Studio Models Chart + Deepy Mascot
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto('http://127.0.0.1:5188/?palette=deepseek&scheme=light&layout=studio&mascot=deepy', {
        waitUntil: 'networkidle',
      });
      await page.waitForTimeout(600);
      // Switch to Models tab
      const tabs = await page.$$('.dsh-claude-home-tab');
      if (tabs[1]) await tabs[1].click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(OUT_DIR, '05-deepseek-models-light.png') });
      await page.close();
    }

    console.log('Screenshots captured successfully in', OUT_DIR);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
