const fs = require("fs");
const path = require("path");
const puppeteer = require('puppeteer-extra');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const os = require('os');

const adBlocker = AdblockerPlugin({
    blockTrackers: true, // default: false
});

const urlFilePath = path.join(__dirname, "urls.txt");

const urls = [
    ...new Set(fs.readFileSync(urlFilePath).toString().trim().split("\n")),
];

setInterval(() => {
    console.log('Free Memory: ', os.freemem());
    console.log('Total Memory: ',os.totalmem());
}, 10000);

async function runner() {
    // Initial Chrome setup and run puppeteer
    const browserConfig = {
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-gpu',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-features=site-per-process',
        ],
        devtools: true,
        dumpio: true,
    };

    puppeteer.use(adBlocker);

    const browser = await puppeteer.launch(browserConfig);

    /**
     * @type import('puppeteer').Page
     */
    const page = await browser.newPage();

    await page.setViewport({
        width: 1440,
        height: 900,
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36');

    page.setDefaultNavigationTimeout(30000);

    page.on('console', (msg) => {
        // Save logs from the browser console
        const logFile = path.join(__dirname, 'logs.txt');
        fs.appendFileSync(logFile, msg.text());
        fs.appendFileSync(logFile, '\n');
    });

    page.on('error', async (e) => {
        console.log(e);
    });

    let urlCount = 1;

    for (const url of urls) {
        try {
            // Navigate + Wait 2500ms + Screenshot + 20 PAGE_DOWN Key Stroke
            const navOptions = {
                waitUntil: 'networkidle2',
                timeout: 30000,
            };
            console.log('Navigating to :', url);
            await page.goto(url, navOptions);

            console.log('Waiting for 2500ms');
            await page.waitFor(2500);

            console.log('Taking Screenshot');
            const screenshotOptions = {
                encoding: 'binary',
                type: 'jpeg',
                quality: 100,
                path: path.join(__dirname, 'screenshot', `${urlCount}.jpg`),
                fullPage: true
            };

            await page.screenshot(screenshotOptions);

            let loop = 20;
            console.log('Pressing page down for 20 times');
            while (loop--) {
                await page.keyboard.press('PageDown');
            }
            await page.waitFor(2000);
            console.log('Page completed: ', urlCount++);
        } catch (e) {
            console.error(e);
        }
    }

    await page.close();
    await browser.close();
}

runner();