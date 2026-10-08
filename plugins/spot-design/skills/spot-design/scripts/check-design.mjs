#!/usr/bin/env node
/**
 * check-design.mjs — 画面の品質を Playwright で実測する（spot-design スキル付属）
 *
 *   node <スキルのフォルダ>/scripts/check-design.mjs <URL または HTMLファイルのパス> [出力フォルダ]
 *
 * 準備（作業するプロジェクトで1回だけ）:
 *   npm i -D playwright && npx playwright install chromium
 *
 * 判定: FAIL が1つでもあれば exit 1（＝「できました」と報告してはいけない状態）。WARN は目で見て判断する。
 * 出力: <出力フォルダ>（既定 ./design-check）に PC/スマホ × ライト/ダーク のスクリーンショット
 */

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

/* ---------------- playwright を「作業中のプロジェクト」から探す ---------------- */
async function loadPlaywright() {
  const tries = [path.join(process.cwd(), 'noop.js'), import.meta.url];
  for (const base of tries) {
    try {
      const req = createRequire(base);
      const p = req.resolve('playwright');
      const mod = await import(pathToFileURL(p).href);
      return mod.chromium ? mod : mod.default;
    } catch { /* 次へ */ }
  }
  console.error('playwright が見つかりません。作業中のプロジェクトで次を実行してください:\n  npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const target = process.argv[2];
if (!target) {
  console.error('使い方: node check-design.mjs <URL または HTMLファイルのパス> [出力フォルダ]');
  process.exit(2);
}
const url = /^https?:\/\//.test(target) ? target : pathToFileURL(path.resolve(process.cwd(), target)).href;
const OUT_DIR = path.resolve(process.cwd(), process.argv[3] || 'design-check');
fs.mkdirSync(OUT_DIR, { recursive: true });

const { chromium } = await loadPlaywright();

const ALLOWED_SPACING = [0, 2, 4, 8, 12, 16, 20, 24, 28, 32, 40, 44, 48, 56, 64, 72, 80, 96];
const results = [];
const add = (level, name, detail) => results.push({ level, name, detail });

/* ---------------- ページ内で実行する測定 ---------------- */
const MEASURE = ({ allowed }) => {
  const px = (v) => parseFloat(v) || 0;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && px(s.opacity) > 0.05;
  };
  const name = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}`;
  const doc = document.documentElement;
  const all = [...document.querySelectorAll('body *')];
  const vis = all.filter(visible);

  /* 横スクロール */
  const overflow = {
    scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth,
    culprits: vis.filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1)
      .filter((el) => !el.closest('[style*="overflow"], .tbl, nav, .steps'))
      .slice(0, 5).map((el) => `${name(el)} (right=${Math.round(el.getBoundingClientRect().right)}px)`),
  };

  /* タップ領域 44px（本文中のリンクは除外） */
  const smallTargets = [...document.querySelectorAll('a[href], button, select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), [role="button"], summary')]
    .filter(visible)
    .filter((el) => !el.closest('p, li:not(nav li):not(.steps li), dd, small, figcaption, td:not(:has(> .rowbtn))'))
    .filter((el) => { const r = el.getBoundingClientRect(); return r.height < 44 || r.width < 24; })
    .slice(0, 10)
    .map((el) => `${el.tagName.toLowerCase()}"${(el.textContent || '').trim().slice(0, 16)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);

  /* 横並びカードの高さ・CTA位置 */
  const groups = all.filter((el) => {
    const s = getComputedStyle(el);
    if (s.display !== 'grid' && s.display !== 'flex') return false;
    if (s.display === 'flex' && s.flexDirection.startsWith('column')) return false;
    if (s.alignItems === 'start' || s.alignItems === 'flex-start' || s.alignItems === 'center' || s.alignItems === 'end' || s.alignItems === 'baseline') return false;
    const kids = [...el.children].filter(visible);
    if (kids.length < 2) return false;
    const tops = kids.map((k) => Math.round(k.getBoundingClientRect().top));
    return new Set(tops).size === 1 && kids.every((k) => k.getBoundingClientRect().height > 80);
  });
  const cardIssues = groups.map((el) => {
    const kids = [...el.children].filter(visible);
    const hs = kids.map((k) => k.getBoundingClientRect().height);
    const ctas = kids.map((k) => [...k.querySelectorAll('a[href], button')].pop()).filter(Boolean);
    const ctaTops = ctas.map((c) => c.getBoundingClientRect().top);
    const ctaDiff = ctaTops.length === kids.length && ctaTops.length > 1 ? Math.max(...ctaTops) - Math.min(...ctaTops) : 0;
    return { sel: name(el), n: kids.length, diff: Math.round(Math.max(...hs) - Math.min(...hs)), ctaDiff: Math.round(ctaDiff) };
  }).filter((g) => g.diff > 1 || g.ctaDiff > 1);

  /* 余白のグリッド */
  const gridViolations = new Map();
  for (const el of vis.slice(0, 1200)) {
    const s = getComputedStyle(el);
    const pd = el.parentElement ? getComputedStyle(el.parentElement).display : '';
    const isItem = pd.includes('flex') || pd.includes('grid');
    const props = isItem
      ? ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'rowGap', 'columnGap']
      : ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'rowGap', 'columnGap'];
    for (const prop of props) {
      const raw = s[prop];
      if (!raw || raw === 'normal' || raw === 'auto' || raw.includes('%')) continue;
      const v = Math.round(px(raw) * 10) / 10;
      if (v === 0 || allowed.includes(v)) continue;
      const key = `${v}px (${prop})`;
      gridViolations.set(key, (gridViolations.get(key) || 0) + 1);
    }
  }

  /* コントラスト */
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) return c.slice(0, 3);
      n = n.parentElement;
    }
    const b = parse(getComputedStyle(document.body).backgroundColor);
    return b.length >= 3 && (b[3] === undefined || b[3] > 0.5) ? b.slice(0, 3) : [255, 255, 255];
  };
  const contrastIssues = [];
  for (const el of vis) {
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!hasText) continue;
    const s = getComputedStyle(el);
    const fg = parse(s.color).slice(0, 3);
    const bg = bgOf(el);
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = px(s.fontSize);
    const bold = parseInt(s.fontWeight, 10) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    if (ratio < need) contrastIssues.push(`${el.tagName.toLowerCase()}"${(el.textContent || '').trim().slice(0, 14)}" ${ratio.toFixed(2)}:1 (必要 ${need}:1 / ${s.color} on rgb(${bg}))`);
    if (contrastIssues.length >= 10) break;
  }

  /* 小さすぎる文字 */
  const tinyText = vis.filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && px(getComputedStyle(el).fontSize) < 11)
    .slice(0, 5).map((el) => `${name(el)} ${getComputedStyle(el).fontSize}`);

  /* AIっぽさの兆候 */
  const gradients = vis.filter((el) => /gradient\(/.test(getComputedStyle(el).backgroundImage)).slice(0, 5).map(name);
  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2728}\u{2B50}\u{1F004}-\u{1F251}]/u;
  const emojis = vis.filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && emojiRe.test(n.textContent))).slice(0, 5)
    .map((el) => `${name(el)}"${el.textContent.trim().slice(0, 12)}"`);
  const bigShadows = vis.filter((el) => { const m = getComputedStyle(el).boxShadow.match(/(\d+)px\s+(\d+)px\s+(\d+)px/); return m && +m[3] >= 24; }).slice(0, 5).map(name);
  const bigRadius = vis.filter((el) => { const r = px(getComputedStyle(el).borderTopLeftRadius); return r >= 20 && r < 500 && el.getBoundingClientRect().height > 120; }).slice(0, 5).map(name);

  /* ダークモードの定義があるか */
  let hasDark = false;
  for (const sh of document.styleSheets) {
    try { for (const r of sh.cssRules) { if (r.media && /prefers-color-scheme:\s*dark/.test(r.media.mediaText)) hasDark = true; if (/data-theme="dark"/.test(r.selectorText || '')) hasDark = true; } } catch { /* 別オリジン */ }
  }

  const meta = {
    lang: doc.lang, title: document.title,
    viewport: !!document.querySelector('meta[name="viewport"]'),
    styleBlocks: document.querySelectorAll('style').length,
    imgsNoAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
    imgsNoDim: [...document.images].filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).length,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    textLen: document.body.innerText.trim().length,
  };

  return { overflow, smallTargets, cardIssues, gridViolations: [...gridViolations.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8), contrastIssues, tinyText, gradients, emojis, bigShadows, bigRadius, hasDark, meta };
};

/* ---------------- 実行 ---------------- */
const browser = await chromium.launch();
const errors = [];

async function run(label, viewport, colorScheme) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, colorScheme });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${label}] console: ${m.text().slice(0, 160)}`); });
  page.on('pageerror', (e) => errors.push(`[${label}] pageerror: ${String(e).slice(0, 160)}`));
  const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  if (resp && resp.status() >= 400) add('FAIL', `${label}: HTTP ${resp.status()}`, url);
  await page.waitForTimeout(600);
  const m = await page.evaluate(MEASURE, { allowed: ALLOWED_SPACING });
  await page.screenshot({ path: path.join(OUT_DIR, `${label}.png`), fullPage: true });
  await ctx.close();
  return m;
}

const mobile = await run('mobile-light', { width: 390, height: 844 }, 'light');
const desktop = await run('desktop-light', { width: 1280, height: 900 }, 'light');
const mobileDark = await run('mobile-dark', { width: 390, height: 844 }, 'dark');
const desktopDark = await run('desktop-dark', { width: 1280, height: 900 }, 'dark');
await browser.close();

/* ---------------- 判定 ---------------- */
add(errors.length ? 'FAIL' : 'PASS', 'JSエラー 0件', errors.length ? [...new Set(errors)].join('\n    ') : 'console error / pageerror ともに 0');
add(desktop.meta.textLen > 0 ? 'PASS' : 'FAIL', '画面が空でない', desktop.meta.textLen > 0 ? `本文 ${desktop.meta.textLen} 文字` : 'body の文字が 0（真っ白）');

for (const [label, m] of [['スマホ 390px', mobile], ['PC 1280px', desktop]]) {
  const ov = m.overflow;
  const bad = ov.scrollWidth > ov.clientWidth + 1;
  add(bad ? 'FAIL' : 'PASS', `${label} 横スクロールなし`,
    bad ? `scrollWidth=${ov.scrollWidth} > clientWidth=${ov.clientWidth} / 原因候補: ${ov.culprits.join(', ') || '不明'}（グリッドは minmax(0,1fr)・子に min-width:0）` : `${ov.scrollWidth}px <= ${ov.clientWidth}px`);
}

add(mobile.smallTargets.length ? 'FAIL' : 'PASS', 'タップ領域 44px 以上（スマホ）', mobile.smallTargets.length ? mobile.smallTargets.join('\n    ') : '全てのボタン・リンクが 44px 以上');

const cardIssues = [...desktop.cardIssues, ...mobile.cardIssues];
add(cardIssues.length ? 'WARN' : 'PASS', '横並びカードの高さ・ボタン位置の揃い',
  cardIssues.length ? cardIssues.map((g) => `${g.sel} 子${g.n}枚: 高さ差${g.diff}px / ボタン上端差${g.ctaDiff}px → カードを flex column にしてボタンに margin-top:auto`).join('\n    ') : '揃っている');

add(desktop.gridViolations.length ? 'WARN' : 'PASS', '余白は 4 の倍数', desktop.gridViolations.length ? desktop.gridViolations.map(([k, n]) => `${k} × ${n}箇所`).join(' / ') : '違反なし');

const ci = [...new Set([...desktop.contrastIssues, ...mobile.contrastIssues])];
add(ci.length ? 'FAIL' : 'PASS', 'コントラスト 4.5:1（大きい文字は 3:1）ライト', ci.length ? ci.join('\n    ') : '基準を満たす');
const cid = [...new Set([...desktopDark.contrastIssues, ...mobileDark.contrastIssues])];
if (desktop.hasDark) add(cid.length ? 'FAIL' : 'PASS', 'コントラスト ダーク', cid.length ? cid.join('\n    ') : '基準を満たす');

add(desktop.tinyText.length ? 'FAIL' : 'PASS', '11px 未満の文字なし', desktop.tinyText.join(' / ') || 'OK');
add(desktop.hasDark ? 'PASS' : 'WARN', 'ダークモードの定義', desktop.hasDark ? 'prefers-color-scheme: dark あり' : '無し。トークンを :root に置き、ダーク用に上書きする');

const smell = [];
if (desktop.gradients.length) smell.push(`グラデーション: ${desktop.gradients.join(', ')}`);
if (desktop.emojis.length) smell.push(`絵文字: ${desktop.emojis.join(', ')}`);
if (desktop.bigShadows.length) smell.push(`ぼかし 24px 以上の影: ${desktop.bigShadows.join(', ')}`);
if (desktop.bigRadius.length) smell.push(`角丸 20px 以上の大きな箱: ${desktop.bigRadius.join(', ')}`);
add(smell.length ? 'WARN' : 'PASS', 'AIっぽさの兆候（principles.md 参照）', smell.join('\n    ') || 'なし');

const meta = desktop.meta;
const mp = [];
if (meta.lang !== 'ja') mp.push(`<html lang> が "${meta.lang || '未設定'}"`);
if (!meta.title) mp.push('<title> なし');
if (!meta.viewport) mp.push('viewport meta なし');
if (meta.imgsNoAlt) mp.push(`alt なしの img ${meta.imgsNoAlt}件`);
add(mp.length ? 'FAIL' : 'PASS', '基本メタ・alt', mp.join(' / ') || 'lang/title/viewport/alt すべてOK');

const hy = [];
if (meta.styleBlocks > 1) hy.push(`<style> が ${meta.styleBlocks} 個（1つにまとめる）`);
if (meta.imgsNoDim) hy.push(`width/height 未指定の img ${meta.imgsNoDim}件`);
add(hy.length ? 'WARN' : 'PASS', 'CSS衛生・画像属性', hy.join(' / ') || 'OK');

/* ---------------- 出力 ---------------- */
const icon = { PASS: '✅', WARN: '🟡', FAIL: '❌' };
console.log(`\n=== デザイン検査 ${url} ===\n`);
for (const r of results) console.log(`${icon[r.level]} ${r.name}\n    ${r.detail}\n`);
console.log(`スクリーンショット: ${OUT_DIR}${path.sep}{desktop,mobile}-{light,dark}.png`);
console.log('※ 目で見る項目: 結論が最初の画面にあるか / ハイライトは1つずつか / 色の意味が一貫しているか / 見本データが架空か\n');
const failed = results.filter((r) => r.level === 'FAIL').length;
const warned = results.filter((r) => r.level === 'WARN').length;
console.log(failed ? `❌ FAIL ${failed}件・WARN ${warned}件 — 直してから報告すること` : `✅ FAIL 0件（WARN ${warned}件は目で確認）`);
process.exit(failed ? 1 : 0);
