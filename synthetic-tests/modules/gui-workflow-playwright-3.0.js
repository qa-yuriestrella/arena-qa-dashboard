import { synthetics } from '@amzn/synthetics-playwright';

const flowBuilderBlueprint = async function () {
    // Insert URL here
    let url = process.env.URL;

    try {
        const browser = await synthetics.launch();
        const browserContext = await browser.newContext();
        const page = await synthetics.newPage(browserContext);

        // Navigate to the initial url
        await synthetics.executeStep('navigateToUrl', async function () {
            // Set page.goto timeout to 30 seconds, adjust as needed
            // See https://playwright.dev/docs/api/class-page for page.goto options
            await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        });

        const actions = JSON.parse(process.env.ACTIONS);
        let action;
        for (let i=0; i < actions.length; i++) {
          action = actions[i];
          
          switch (action.type) {
            case 'click':
              await synthetics.executeStep('click' + i, async function () {
                  await page.waitForSelector(action.selector);
                  await page.click(action.selector);
              });
              break;
            case 'verifySelector':
              await synthetics.executeStep('verifySelector' + i, async function () {
                  await page.waitForSelector(action.selector);
              });
              break;
            case 'verifyText':           
              await synthetics.executeStep('verifyText' + i, async function () {
                  await page.waitForSelector(action.selector + '[contains(text(),' + action.selector + ')]');
              });
              break;
            case 'input':
              await synthetics.executeStep('input' + i, async function () {
                  await page.type(action.selector, action.text);
              });
              break;
            case 'redirection':
              await synthetics.executeStep('redirection' + i, async function () {
                  await Promise.all([
                      page.waitForNavigation({ timeout: 10000 }),
                      await page.click(action.selector)
                  ]);
              });
              break;
            default:
              console.log('Not action of type: ', action[i]);
          }

            // --- injected Terraform code ---
            ${custom_code}
            // --- end injected code ---

        }
    } finally {
        // Ensure browser is closed
        await synthetics.close();
    }
};

export const handler = async (event, context) => {
    return await flowBuilderBlueprint();
};
