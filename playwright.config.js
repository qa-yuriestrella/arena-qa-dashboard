require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const { defineConfig, devices } = require('@playwright/test');
const { defineBddConfig } = require('playwright-bdd');

/**
 * playwright-bdd lê os arquivos .feature e gera testes Playwright
 * automaticamente na pasta .features-gen/ antes de cada execução.
 *
 * Comandos principais:
 *   yarn test:ui       → abre a interface gráfica do Playwright (melhor para debug)
 *   yarn test:headed   → roda no browser visível sem a interface gráfica
 *   yarn test          → roda em modo headless (para CI)
 */
const testDir = defineBddConfig({
  // Onde ficam os arquivos .feature (Gherkin em português)
  features: 'tests/features/**/*.feature',
  // Onde ficam os step definitions
  steps: ['tests/step_definitions/**/*.steps.js', 'tests/fixtures.js'],
});

module.exports = defineConfig({
  testDir,

  // Timeout por teste. 480s to account for KB025 voice recording (15s minimum) + slowMo
  // + DPS016 server-side file upload (120-180s on staging) + waitForFunction buffer.
  timeout: 480 * 1000,

  // Em CI: 1 retry. Localmente: 0 (falha rápido para debug)
  retries: process.env.CI ? 1 : 0,

  // Rodar testes em sequência (não paralelo) para evitar conflitos de dados
  workers: process.env.CI ? 2 : 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    // URL base do ambiente. Sobrescrever com: BASE_URL=https://... yarn test
    baseURL: process.env.BASE_URL || 'https://stg-dash-avatar.arena.im',

    // Mostrar o browser durante os testes (false = mais rápido, true = debug visual)
    headless: !!process.env.CI,

    launchOptions: {
      slowMo: process.env.CI ? 0 : 300,
    },

    // Captura automática em caso de falha
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on',

    // Viewport padrão
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['microphone'],
        launchOptions: {
          slowMo: process.env.CI ? 0 : 300,
          args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
        },
      },
    },
  ],
});
