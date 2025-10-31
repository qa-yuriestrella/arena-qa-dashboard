const fakeName = faker.person.fullName();
const fakeEmail = faker.internet.email();
const fakePassword = faker.internet.password({ length: 10 });
const fakeCVC = faker.string.numeric(3);

await page.locator('[name="name"]').fill(fakeName);
await page.locator('[name="email"]').fill(fakeEmail);
await page.locator('[name="password"]').fill(fakePassword);

const responsePromise = page.waitForResponse(
  (res) => res.url().includes("customer-user/signup") && res.status() === 201
);

await page.getByRole("button", { name: "Sign up!" }).click();

const response = await responsePromise;
expect(response.status()).toBe(201);
await page.getByRole("link", { name: "Create your Avatar" }).click();
await page
  .frameLocator('iframe[name^="cb-component-number"]')
  .locator("input#cardnumber")
  .fill("4111111111111111");
await page
  .frameLocator('iframe[name^="cb-component-expiry"]')
  .locator("input#exp-date")
  .fill("1230");
await page
  .frameLocator('iframe[name^="cb-component-cvv"]')
  .getByRole("textbox", { name: "CVV" })
  .fill(fakeCVC);

await page.locator("#card-name").type(fakeName, { delay: 100 });

const responsePromise2 = page.waitForResponse(
  (res) => res.url().includes("/onboarding/checkout") && res.status() === 200
);
await page.getByRole("button", { name: "Start Trial" }).click();
const response2 = await responsePromise2;
expect(response2.status()).toBe(200);
