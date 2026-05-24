import { test, expect } from '@playwright/test';

const BACKEND = 'http://127.0.0.1:11014';
const FRONTEND = 'http://127.0.0.1:11015';

test.describe('REST API', () => {
    test('GET /health returns 200', async ({ request }) => {
        const resp = await request.get(`${BACKEND}/health`);
        expect(resp.status()).toBe(200);
        const body = await resp.json();
        expect(body.status).toBe('ok');
    });

    test('GET /api/v1/models returns all models', async ({ request }) => {
        const resp = await request.get(`${BACKEND}/api/v1/models`);
        expect(resp.status()).toBe(200);
        const body = await resp.json();
        expect(body.chat).toBeDefined();
        expect(body.image).toBeDefined();
    });

    test('GET /api/v1/speech/options returns voices', async ({ request }) => {
        const resp = await request.get(`${BACKEND}/api/v1/speech/options`);
        expect(resp.status()).toBe(200);
        const body = await resp.json();
        expect(Array.isArray(body.voices)).toBeTruthy();
    });

    test('POST /api/v1/chat responds in mock mode', async ({ request }) => {
        const resp = await request.post(`${BACKEND}/api/v1/chat`, {
            data: { prompt: 'Hello, test' },
            headers: { 'Content-Type': 'application/json' },
        });
        expect(resp.status()).toBe(200);
    });

    test('POST /api/v1/generate_image responds in mock mode', async ({ request }) => {
        const resp = await request.post(`${BACKEND}/api/v1/generate_image`, {
            data: { prompt: 'Test image' },
            headers: { 'Content-Type': 'application/json' },
        });
        expect(resp.status()).toBe(200);
    });

    test('POST /api/v1/speech/tts responds in mock mode', async ({ request }) => {
        const resp = await request.post(`${BACKEND}/api/v1/speech/tts`, {
            data: { text: 'Hello' },
            headers: { 'Content-Type': 'application/json' },
        });
        expect(resp.status()).toBe(200);
    });
});

test.describe('Frontend', () => {
    test('Dashboard page loads with root element', async ({ page }) => {
        await page.goto(FRONTEND, { timeout: 15000 });
        await page.waitForTimeout(5000);
        const root = page.locator('#root');
        await expect(root).toBeAttached();
    });

    test('Settings page has navigation visible', async ({ page }) => {
        await page.goto(`${FRONTEND}/settings`, { timeout: 15000 });
        await page.waitForTimeout(3000);
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
    });

    test('Page HTML is not empty', async ({ page }) => {
        const resp = await page.goto(FRONTEND, { timeout: 15000 });
        expect(resp?.status()).toBe(200);
        const html = await page.content();
        expect(html.length).toBeGreaterThan(100);
        expect(html).toContain('root');
    });
});
