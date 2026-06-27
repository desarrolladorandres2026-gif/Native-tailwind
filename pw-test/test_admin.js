const { chromium } = require('playwright');

const SHOT = 'c:/Users/desar/AppData/Local/Temp/claude/c--Users-desar-OneDrive-Desktop-Native-tailwind/eb5db80d-4833-449b-914b-7698bc7871ed/scratchpad';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleErrors = [];
  const failed = [];
  const apiResponses = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('requestfailed', r => failed.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText}`));
  page.on('response', async r => {
    const u = r.url();
    if (u.includes('/admin') || u.includes('/api/')) apiResponses.push(`${r.status()} ${r.request().method()} ${u}`);
  });

  // ── 1. Landing del apk-server ──
  await page.goto('http://localhost:3030/', { waitUntil: 'networkidle' });
  console.log('1) Landing title:', JSON.stringify(await page.title()));
  await page.screenshot({ path: `${SHOT}/01_landing.png` });

  // ── 2. Botón Admin ──
  const adminLink = page.locator('a.nav-admin').first();
  const href = await adminLink.getAttribute('href');
  console.log('2) Admin href:', href);

  await adminLink.click();
  await page.waitForTimeout(3000); // dar tiempo a redirects
  console.log('3) URL tras click Admin:', page.url());
  console.log('   <title> tras click:', JSON.stringify(await page.title().catch(() => 'N/A')));
  await page.screenshot({ path: `${SHOT}/02_tras_click_admin.png` });

  // ¿hay formulario de login visible?
  const loginVisible = await page.locator('#login-form').isVisible().catch(() => false);
  console.log('4) ¿login-form visible?:', loginVisible);

  if (loginVisible) {
    await page.fill('#login-email', 'felipemartinez101203@gmail.com');
    await page.fill('#login-password', 'empanadas20');
    await page.screenshot({ path: `${SHOT}/03_login_lleno.png` });
    await page.click('#login-btn');
    await page.waitForTimeout(4000);
    console.log('5) URL tras login:', page.url());
    const errBox = await page.locator('#login-error').textContent().catch(() => '');
    const appShellVisible = await page.locator('#app-shell').isVisible().catch(() => false);
    console.log('   login-error:', JSON.stringify((errBox || '').trim()));
    console.log('   ¿app-shell (dashboard) visible?:', appShellVisible);
    await page.screenshot({ path: `${SHOT}/04_tras_login.png`, fullPage: true });
  } else {
    // capturar el body para ver qué se muestra ("no carga nada")
    const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 300);
    console.log('   body (300c):', JSON.stringify(bodyText));
  }

  console.log('\n── Respuestas /admin y /api ──');
  apiResponses.forEach(r => console.log('  ', r));
  console.log('\n── Requests fallidos ──');
  failed.forEach(r => console.log('  ', r));
  console.log('\n── Errores de consola ──');
  consoleErrors.forEach(r => console.log('  ', r));

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
