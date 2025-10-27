const fakeName = faker.person.fullName();
const fakeEmail = faker.internet.email();
const fakePassword = faker.internet.password({ length: 10 });

await page.locator('[name="name"]').fill(fakeName);
await page.locator('[name="email"]').fill(fakeEmail);
await page.locator('[name="password"]').fill(fakePassword);

const responsePromise = page.waitForResponse(
  (response) =>
    response.url().includes("auth-dev.arena.im/customer-user/signup") &&
    response.status() === 201
);
await page.getByRole("button", { name: "Sign up!" }).click();
const response = await responsePromise;
expect(response.status()).toBe(201);
