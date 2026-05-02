import { expect, test } from "@playwright/test";

async function readAppConfig(page) {
  const response = await page.request.get("/healthz");
  return response.ok() ? response.json() : { multiplayerEnabled: false };
}

async function skipUnlessMultiplayer(page) {
  const config = await readAppConfig(page);
  test.skip(!config.multiplayerEnabled, "PostgreSQL-backed multiplayer is unavailable.");
}

async function clearDatabase(page) {
  const config = await readAppConfig(page);
  if (!config.devMode || !config.dbAvailable) {
    return;
  }

  await page.request.post("/api/admin/db/clear").catch(() => null);
}

async function savePlayerName(page, name) {
  await page.goto("/");
  await page.getByPlaceholder("Enter your name").fill(name);
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText(name)).toBeVisible();
}

async function startQuickMatch(page, name) {
  await savePlayerName(page, name);
  await page.getByRole("button", { name: "Quick match" }).click();
  await expect(page).toHaveURL(/\/matchmaking/);
}

async function waitForWaitingRoom(page) {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    const response = await page.request.get("/api/active-games");
    if (response.ok()) {
      const payload = await response.json();
      const room = payload.games?.find(game => game.status === "waiting");
      if (room?.id) {
        return room.id;
      }
    }

    await page.waitForTimeout(250);
  }

  throw new Error("Timed out waiting for a waiting room.");
}

async function createMatchedPlayers(page, browser) {
  await skipUnlessMultiplayer(page);
  await clearDatabase(page);

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();

  await startQuickMatch(page, "Player Alpha");
  await startQuickMatch(secondPage, "Player Beta");

  await expect(page).toHaveURL(/\/game\/mp\/.+/, { timeout: 15_000 });
  await expect(secondPage).toHaveURL(/\/game\/mp\/.+/, { timeout: 15_000 });

  const roomId = new URL(page.url()).pathname.split("/").pop();
  expect(new URL(secondPage.url()).pathname.endsWith(roomId)).toBeTruthy();

  await page.getByRole("button", { name: "Start game" }).click();
  await secondPage.getByRole("button", { name: "Start game" }).click();

  await expect(page.getByRole("button", { name: "Request draw" })).toBeVisible({ timeout: 12_000 });
  await expect(secondPage.getByRole("button", { name: "Request draw" })).toBeVisible({ timeout: 12_000 });

  return { secondContext, secondPage, roomId };
}

test("local game supports keyboard board play and restart", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Local match" }).click();
  await expect(page).toHaveURL(/\/game\/local/);
  await expect(page.getByRole("grid", { name: "Quantum tic-tac-toe board" })).toBeVisible();

  await page.getByRole("button", { name: "Skip countdown" }).click();
  await page.getByRole("button", { name: /Cell 1/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('text[data-symbol="X1"]')).toBeVisible();

  await page.getByRole("button", { name: "Restart match" }).click();
  await expect(page.getByText("Local match restarted.")).toBeVisible();
});

test.describe("multiplayer flows", () => {
  test("quick match pairs two players", async ({ page, browser }) => {
    const { secondContext } = await createMatchedPlayers(page, browser);
    await secondContext.close();
  });

  test("join by ID opens an existing waiting room", async ({ page, browser }) => {
    await skipUnlessMultiplayer(page);
    await clearDatabase(page);

    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();

    await startQuickMatch(page, "Room Host");
    const roomId = await waitForWaitingRoom(page);

    await savePlayerName(secondPage, "Room Joiner");
    await secondPage.getByRole("button", { name: "Join by ID" }).click();
    await secondPage.getByPlaceholder("Enter room id").fill(roomId);
    await secondPage.getByRole("button", { name: "Open room" }).click();

    await expect(secondPage).toHaveURL(new RegExp(`/game/mp/${roomId}$`));
    await expect(page).toHaveURL(new RegExp(`/game/mp/${roomId}$`), { timeout: 15_000 });

    await secondContext.close();
  });

  test("draw request can be accepted", async ({ page, browser }) => {
    const { secondContext, secondPage } = await createMatchedPlayers(page, browser);

    await page.getByRole("button", { name: "Request draw" }).click();
    await expect(secondPage.getByRole("button", { name: "Accept draw" })).toBeVisible();
    await secondPage.getByRole("button", { name: "Accept draw" }).click();

    await expect(page.getByRole("dialog", { name: "Match complete" })).toBeVisible();
    await expect(secondPage.getByRole("dialog", { name: "Match complete" })).toBeVisible();

    await secondContext.close();
  });

  test("restart request can be accepted during play", async ({ page, browser }) => {
    const { secondContext, secondPage } = await createMatchedPlayers(page, browser);

    await page.getByRole("button", { name: "Request restart" }).click();
    await expect(secondPage.getByRole("button", { name: "Accept restart" })).toBeVisible();
    await secondPage.getByRole("button", { name: "Accept restart" }).click();

    await expect(page.getByRole("button", { name: "Request draw" })).toBeVisible({ timeout: 12_000 });
    await expect(secondPage.getByRole("button", { name: "Request draw" })).toBeVisible({ timeout: 12_000 });

    await secondContext.close();
  });

  test("player can reconnect to the same room", async ({ page, browser }) => {
    const { secondContext, secondPage, roomId } = await createMatchedPlayers(page, browser);

    await secondPage.close();
    await expect(page.getByText(/disconnected/i)).toBeVisible({ timeout: 8_000 });

    const reconnectedPage = await secondContext.newPage();
    await reconnectedPage.goto(`/game/mp/${roomId}`);
    await expect(reconnectedPage).toHaveURL(new RegExp(`/game/mp/${roomId}$`));
    await expect(reconnectedPage.getByRole("grid", { name: "Quantum tic-tac-toe board" })).toBeVisible();

    await expect(page.getByText(/disconnected/i)).toBeHidden({ timeout: 10_000 });

    await secondContext.close();
  });
});
