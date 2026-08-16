#!/usr/bin/env node
/**
 * generate.mjs — merge intents.json (+ meta) into final deliverables.
 *
 * Emits, for every plugin, BOTH a Chinese intent (intentZh) and an English
 * intent (intentEn). Outputs:
 *   pages/plugins.csv          — flat spreadsheet (both intent columns)
 *   catalog/plugins.md         — combined markdown table (both intent columns)
 *   pages/index.html           — interactive site (both intent columns)
 *   catalog/plugins.zh.md + pages/plugins.zh.html  — 中文版 (intent = Chinese)
 *   catalog/plugins.en.md + pages/plugins.en.html  — English version (intent = English)
 *
 * HTML/CSV artifacts are written into ../pages so they ship with the repo and
 * are deployed to GitHub Pages via .github/workflows/deploy.yml; the .md files
 * stay in catalog/ as gitignored dev intermediates.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PAGES = join(ROOT, 'pages')
const INTENTS = join(__dirname, 'intents.json')
const META = join(__dirname, 'meta-raw.json')
const SIZES = join(__dirname, 'sizes-raw.json')

const intents = existsSync(INTENTS) ? JSON.parse(readFileSync(INTENTS, 'utf8')) : {}
const meta = existsSync(META) ? JSON.parse(readFileSync(META, 'utf8')) : {}
const sizes = existsSync(SIZES) ? JSON.parse(readFileSync(SIZES, 'utf8')) : {}

function fmtSize(b) {
  if (b == null) return ''
  if (b >= 1048576) return (b / 1048576).toFixed(1) + 'MB'
  if (b >= 1024) return (b / 1024).toFixed(0) + 'KB'
  return b + 'B'
}

const rows = Object.values(intents).map(r => {
  const m = meta[r.repo] || {}
  const clean = s => (s || '').toString().replace(/\r?\n/g, ' ').trim()
  return {
    repo: r.repo,
    url: `https://github.com/${r.repo}`,
    intentEn: clean(r.intentEn || r.intent || m.description || '').slice(0, 280),
    intentZh: clean(r.intentZh || r.intent || '').slice(0, 280),
    category: r.dshCategory || 'uncategorized',
    isDsh: r.isDshPlugin ? 'yes' : 'no',
    signals: (r.dshSignals || []).join('; '),
    language: r.language || '',
    tech: (r.techStack || []).join(', '),
    keyDeps: (r.keyDeps || []).join(', '),
    stars: r.stars ?? m.stars ?? 0,
    forks: r.forks ?? m.forks ?? 0,
    sizeBytes: sizes[r.repo] ?? null,
    sizeHuman: fmtSize(sizes[r.repo] ?? null),
    created: (r.created_at || m.created_at || '').slice(0, 10),
    updated: (r.updated_at || m.updated_at || '').slice(0, 10),
    license: r.license || m.license || '',
    openIssues: r.open_issues ?? m.open_issues ?? '',
    compat: r.compat || '',
    cloned: r.cloned ? 'yes' : 'no',
    lists: (r.lists || []).join(','),
    needsReview: !!r.needsReview,
  }
})
// code-analysis fallback (no real description) ranks last; otherwise by stars
rows.sort((a, b) => (a.needsReview ? 1 : 0) - (b.needsReview ? 1 : 0) || (b.stars || 0) - (a.stars || 0))

const totalSize = fmtSize(Object.values(sizes).reduce((a, b) => a + (b || 0), 0))
const dshN = rows.filter(r => r.isDsh === 'yes').length
const clonedN = rows.filter(r => r.cloned === 'yes').length
const totalN = rows.length
const date = new Date().toISOString().slice(0, 10)

// ---------- CSV (combined, both intent columns) ----------
const cols = ['repo', 'url', 'intentZh', 'intentEn', 'category', 'isDsh', 'language', 'tech', 'keyDeps',
  'stars', 'forks', 'sizeBytes', 'sizeHuman', 'created', 'updated', 'license', 'openIssues', 'compat', 'cloned', 'needsReview', 'lists', 'signals']
const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
writeFileSync(join(PAGES, 'plugins.csv'),
  [cols.join(',')].concat(rows.map(r => cols.map(c => esc(r[c])).join(','))).join('\n'))

// ---------- UI text per language ----------
const UI = {
  zh: {
    title: 'Blue-Whale-Harness · DSH 插件总表',
    search: '搜索仓库 / 意图 / 分类 / 技术栈…',
    catAll: '全部分类', all: '全部', onlyDsh: '仅真·DSH', onlyNon: '仅非DSH',
    sorts: { stars: '按 STAR', forks: '按 FORK', created: '按创建时间', updated: '按更新时间', repo: '按仓库名' },
    cols: { repo: '仓库', intent: '意图', category: '分类', isDsh: '真DSH', language: '语言', stars: 'STAR', forks: 'FORK', size: '大小', created: '创建', updated: '更新', license: 'License', compat: '兼容' },
    intentField: 'intentZh',
    subtitle: `> 自动生成于 ${date} ｜ 共 **${totalN}** 个仓库 ｜ 真·DSH 插件 **${dshN}** 个 ｜ 已克隆 **${clonedN}** 个 ｜ 源码总体积 **${totalSize}**（不含 .git）`,
  },
  en: {
    title: 'Blue-Whale-Harness · DSH Plugin Catalog',
    search: 'Search repo / intent / category / tech…',
    catAll: 'All categories', all: 'All', onlyDsh: 'DSH only', onlyNon: 'Non-DSH',
    sorts: { stars: 'by STAR', forks: 'by FORK', created: 'by created', updated: 'by updated', repo: 'by repo' },
    cols: { repo: 'Repo', intent: 'Intent', category: 'Category', isDsh: 'DSH', language: 'Lang', stars: 'STAR', forks: 'FORK', size: 'Size', created: 'Created', updated: 'Updated', license: 'License', compat: 'Compat' },
    intentField: 'intentEn',
    subtitle: `> Generated ${date} ｜ **${totalN}** repos ｜ **${dshN}** real DSH plugins ｜ **${clonedN}** cloned ｜ source total **${totalSize}** (excl. .git)`,
  },
}

function mdTable(UI, intentKey) {
  const head = `| ${UI.cols.repo} | ${UI.cols.intent} | ${UI.cols.category} | ${UI.cols.isDsh} | ${UI.cols.language} | ${UI.cols.stars} | ${UI.cols.forks} | ${UI.cols.size} | ${UI.cols.created} | ${UI.cols.updated} | ${UI.cols.license} | ${UI.cols.compat} |`
  const sep = `|---|---|---|---|---|---|---|---|---|---|---|---|`
  const body = rows.map(r =>
    `| [${r.repo}](${r.url}) | ${(r[intentKey] || '').slice(0, 120)} | ${r.category} | ${r.isDsh} | ${r.language} | ${r.stars} | ${r.forks} | ${r.sizeHuman} | ${r.created} | ${r.updated} | ${r.license} | ${r.compat} |`
  ).join('\n')
  return UI.subtitle + '\n\n' + head + '\n' + sep + '\n' + body + '\n'
}

const REPO_URL = 'https://github.com/leenkcool/Blue-Whale-Harness'

// ---------- light-default theme (switchable to existing dark tone) ----------
// :root = light (default); :root[data-theme="dark"] = the previous GitHub-dark tone.
const THEME_CSS = `:root{--bg:#ffffff;--fg:#1f2328;--mut:#636c76;--acc:#0969da;--bd:#d0d7de;--odd:#f6f8fa;--input-bg:#ffffff;--th-bg:#f6f8fa;--yes:#1a7f37}
:root[data-theme="dark"]{--bg:#0d1117;--fg:#c9d1d9;--mut:#8b949e;--acc:#58a6ff;--bd:#30363d;--odd:#161b22;--input-bg:#0d1117;--th-bg:#161b22;--yes:#3fb950}
*{box-sizing:border-box}
body{margin:0;font:14px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--fg)}
header{padding:16px 20px;border-bottom:1px solid var(--bd);position:sticky;top:0;background:var(--bg);z-index:5}
h1{margin:0 0 4px;font-size:18px}
.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}
input,select{background:var(--input-bg);color:var(--fg);border:1px solid var(--bd);border-radius:6px;padding:6px 8px;font-size:13px}
input[type=search]{flex:1;min-width:200px}
.stat{color:var(--mut);font-size:12px}
table{width:100%;border-collapse:collapse}
th,td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--bd);vertical-align:top}
th{position:sticky;top:110px;background:var(--th-bg);cursor:pointer;user-select:none;white-space:nowrap}
th:hover{color:var(--acc)}
tbody tr:nth-child(odd){background:var(--odd)}
a{color:var(--acc);text-decoration:none}
a:hover{text-decoration:underline}
.tag{display:inline-block;padding:1px 6px;border:1px solid var(--bd);border-radius:10px;font-size:11px;color:var(--mut)}
.yes{color:var(--yes)}.no{color:var(--mut)}
.intent{color:var(--mut);max-width:360px}
.num{text-align:right;font-variant-numeric:tabular-nums}
.repo-link{margin:2px 0 8px;font-size:13px}
.theme-btn{margin-left:auto;cursor:pointer;background:var(--input-bg);color:var(--fg);border:1px solid var(--bd);border-radius:6px;padding:6px 10px;font-size:13px}
`
// runs in <head> before paint: read saved theme (default light), avoid flash
const THEME_HEAD = `<script>(function(){try{var t=localStorage.getItem("bw-theme")||"light";document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="light"}})()</script>\n`
// toggle button handler + label sync (appended to the page script)
const THEME_JS = `var themeBtn=document.getElementById("themeBtn");
function bwUpdThemeBtn(){themeBtn.textContent=document.documentElement.dataset.theme==="dark"?"☀️ 浅色":"🌙 深色";}
themeBtn.onclick=function(){var t=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=t;try{localStorage.setItem("bw-theme",t)}catch(e){}bwUpdThemeBtn();};
bwUpdThemeBtn();
`

function htmlDoc(UI, intentKey, extraCols) {
  const C = UI.cols
  const headCols = ['<th data-k="repo">' + C.repo + '</th>',
    '<th data-k="intent">' + C.intent + '</th>',
    '<th data-k="category">' + C.category + '</th>',
    '<th data-k="isDsh">' + C.isDsh + '</th>',
    '<th data-k="language">' + C.language + '</th>',
    '<th data-k="stars" class="num">' + C.stars + '</th>',
    '<th data-k="forks" class="num">' + C.forks + '</th>',
    '<th data-k="sizeBytes" class="num">' + C.size + '</th>',
    '<th data-k="created">' + C.created + '</th>',
    '<th data-k="updated">' + C.updated + '</th>',
    '<th data-k="license">' + C.license + '</th>',
    '<th data-k="compat">' + C.compat + '</th>'].join('\n')
  const sortOpts = Object.entries(UI.sorts)
    .map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('')
  const searchIncludes = extraCols && extraCols.length
    ? "d.intentZh+' '+d.intentEn+' " + extraCols.map(c => 'd.' + c).join("+' '+") + " "
    : "d.intentZh+' '+d.intentEn+' "
  const sb = []
  sb.push('<tr>')
  sb.push('<td><a href="\'+r.url+\'" target="_blank">\'+r.repo+\'</a></td>')
  sb.push('<td class="intent">\'+esc(r.' + intentKey + '||\'\')+\'</td>')
  sb.push('<td><span class="tag">\'+r.category+\'</span></td>')
  sb.push('<td class="\'+r.isDsh+\'">\'+(r.isDsh===\'yes\'?\'✔\':\'—\')+\'</td>')
  sb.push('<td>\'+(r.language||\'\')+\'</td>')
  sb.push('<td class="num">\'+r.stars+\'</td><td class="num">\'+r.forks+\'</td><td class="num">\'+r.sizeHuman+\'</td>')
  sb.push('<td>\'+(r.created)+\'</td><td>\'+(r.updated)+\'</td>')
  sb.push('<td>\'+(r.license||\'\')+\'</td><td>\'+(r.compat||\'\')+\'</td></tr>')
  const rowFn = 'function rowHtml(r){return \'' + sb.join('') + '\';}'
  return '<!doctype html>\n'
    + '<html lang="' + (UI === UI.zh ? 'zh' : 'en') + '"><head><meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>' + UI.title + '</title>\n'
    + '<style>\n'
    + THEME_CSS
    + '</style></head>\n'
    + THEME_HEAD
    + '<body>\n<header>\n<h1>' + UI.title + '</h1>\n<div class="repo-link"><a href="' + REPO_URL + '" target="_blank" rel="noopener">📦 源码仓库 · Blue-Whale-Harness</a></div>\n<div class="bar">\n'
    + '<input type="search" id="q" placeholder="' + UI.search + '">\n'
    + '<select id="cat"><option value="">' + UI.catAll + '</option></select>\n'
    + '<select id="dsh"><option value="">' + UI.all + '</option><option value="yes">' + UI.onlyDsh + '</option><option value="no">' + UI.onlyNon + '</option></select>\n'
    + '<select id="sort">' + sortOpts + '</select>\n'
    + '<span class="stat" id="cnt"></span>\n'
    + '<button class="theme-btn" id="themeBtn"></button>\n</div>\n</header>\n'
    + '<table><thead><tr>\n' + headCols + '\n</tr></thead><tbody id="tb"></tbody></table>\n'
    + '<script>\n'
    + 'const DATA=__DATA__;\n'
    + 'const catSel=document.getElementById("cat"),dshSel=document.getElementById("dsh"),q=document.getElementById("q"),sortSel=document.getElementById("sort"),tb=document.getElementById("tb"),cnt=document.getElementById("cnt");\n'
    + '[...new Set(DATA.map(d=>d.category))].sort().forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;catSel.appendChild(o)});\n'
    + 'let sortDir=-1;\n'
    + 'function esc(s){return (s||"").replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}\n'
    + rowFn + '\n'
    + 'function render(){\n'
    + ' const qv=q.value.toLowerCase(),cv=catSel.value,dv=dshSel.value,sk=sortSel.value;\n'
    + ' let rows=DATA.filter(d=>(!cv||d.category===cv)&&(!dv||d.isDsh===dv)&&(!qv||(' + searchIncludes + 'd.repo+" "+d.category+" "+d.tech+" "+d.language).toLowerCase().includes(qv)));\n'
    + ' rows.sort((a,b)=>{let x=a[sk],y=b[sk];if(sk==="repo"||sk==="created"||sk==="updated"){x=String(x);y=String(y);return sortDir*x.localeCompare(y);}return sortDir*((x||0)-(y||0));});\n'
    + ' tb.innerHTML=rows.map(rowHtml).join("");\n'
    + ' cnt.textContent=rows.length+" / "+DATA.length+" ' + (UI === UI.zh ? '个' : 'items') + '";\n'
    + '}\n'
    + 'q.oninput=render;catSel.onchange=render;dshSel.onchange=render;sortSel.onchange=render;\n'
    + 'document.querySelectorAll("th[data-k]").forEach(th=>th.onclick=()=>{sortSel.value=th.dataset.k;sortDir*=-1;render();});\n'
    + THEME_JS
    + 'render();\n'
    + '</script></body></html>\n'
}

// ---------- combined markdown (both intent columns) ----------
const mdCombined = `# Blue-Whale-Harness · DSH 插件总表（中英双语意图）

${UI.zh.subtitle}

| 仓库 | 意图(中文) | Intent(English) | 分类 | 真DSH | 语言 | STAR | FORK | 大小 | 创建 | 更新 | License | 兼容 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
` + rows.map(r =>
  `| [${r.repo}](${r.url}) | ${(r.intentZh || '').slice(0, 90)} | ${(r.intentEn || '').slice(0, 90)} | ${r.category} | ${r.isDsh} | ${r.language} | ${r.stars} | ${r.forks} | ${r.sizeHuman} | ${r.created} | ${r.updated} | ${r.license} | ${r.compat} |`
).join('\n') + '\n'
writeFileSync(join(__dirname, 'plugins.md'), mdCombined)

// ---------- combined interactive HTML (both intent columns) ----------
const dataJson = JSON.stringify(rows).replace(/</g, '\\u003c')

// ---------- write language-specific files ----------
writeFileSync(join(__dirname, 'plugins.zh.md'), '# ' + UI.zh.title + '\n\n' + mdTable(UI.zh, 'intentZh'))
writeFileSync(join(__dirname, 'plugins.en.md'), '# ' + UI.en.title + '\n\n' + mdTable(UI.en, 'intentEn'))
writeFileSync(join(PAGES, 'plugins.zh.html'), htmlDoc(UI.zh, 'intentZh').replace('__DATA__', dataJson))
writeFileSync(join(PAGES, 'plugins.en.html'), htmlDoc(UI.en, 'intentEn').replace('__DATA__', dataJson))
const comboHead = ['<th data-k="repo">仓库</th>',
  '<th data-k="intentZh">意图(中文)</th>',
  '<th data-k="intentEn">Intent(EN)</th>',
  '<th data-k="category">分类</th>',
  '<th data-k="isDsh">真DSH</th>',
  '<th data-k="language">语言</th>',
  '<th data-k="stars" class="num">STAR</th>',
  '<th data-k="forks" class="num">FORK</th>',
  '<th data-k="sizeBytes" class="num">大小</th>',
  '<th data-k="created">创建</th>',
  '<th data-k="updated">更新</th>',
  '<th data-k="license">License</th>',
  '<th data-k="compat">兼容</th>'].join('\n')
const comboRow = 'function rowHtml(r){return \'<tr>\'' +
  '+\'<td><a href="\'+r.url+\'" target="_blank">\'+r.repo+\'</a></td>\'' +
  '+\'<td class="intent">\'+esc(r.intentZh||\'\')+\'</td>\'' +
  '+\'<td class="intent">\'+esc(r.intentEn||\'\')+\'</td>\'' +
  '+\'<td><span class="tag">\'+r.category+\'</span></td>\'' +
  '+\'<td class="\'+r.isDsh+\'">\'+(r.isDsh===\'yes\'?\'✔\':\'—\')+\'</td>\'' +
  '+\'<td>\'+(r.language||\'\')+\'</td>\'' +
  '+\'<td class="num">\'+r.stars+\'</td><td class="num">\'+r.forks+\'</td><td class="num">\'+r.sizeHuman+\'</td>\'' +
  '+\'<td>\'+(r.created)+\'</td><td>\'+(r.updated)+\'</td>\'' +
  '+\'<td>\'+(r.license||\'\')+\'</td><td>\'+(r.compat||\'\')+\'</td></tr>\';}'
const comboHtml = '<!doctype html>\n'
  + '<html lang="zh"><head><meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
  + '<title>Blue-Whale-Harness · DSH 插件总表（中英双语）</title>\n'
  + '<style>\n:root{--bg:#ffffff;--fg:#1f2328;--mut:#636c76;--acc:#0969da;--bd:#d0d7de;--odd:#f6f8fa;--input-bg:#ffffff;--th-bg:#f6f8fa;--yes:#1a7f37}:root[data-theme="dark"]{--bg:#0d1117;--fg:#c9d1d9;--mut:#8b949e;--acc:#58a6ff;--bd:#30363d;--odd:#161b22;--input-bg:#0d1117;--th-bg:#161b22;--yes:#3fb950}\n*{box-sizing:border-box}\nbody{margin:0;font:14px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--fg)}\nheader{padding:16px 20px;border-bottom:1px solid var(--bd);position:sticky;top:0;background:var(--bg);z-index:5}\nh1{margin:0 0 4px;font-size:18px}\n.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}\ninput,select{background:var(--input-bg);color:var(--fg);border:1px solid var(--bd);border-radius:6px;padding:6px 8px;font-size:13px}\ninput[type=search]{flex:1;min-width:200px}\n.stat{color:var(--mut);font-size:12px}\ntable{width:100%;border-collapse:collapse}\nth,td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--bd);vertical-align:top}\nth{position:sticky;top:110px;background:var(--th-bg);cursor:pointer;user-select:none;white-space:nowrap}\nth:hover{color:var(--acc)}\ntbody tr:nth-child(odd){background:var(--odd)}\na{color:var(--acc);text-decoration:none}\na:hover{text-decoration:underline}\n.tag{display:inline-block;padding:1px 6px;border:1px solid var(--bd);border-radius:10px;font-size:11px;color:var(--mut)}\n.yes{color:var(--yes)}.no{color:var(--mut)}\n.intent{color:var(--mut);max-width:300px}\n.num{text-align:right;font-variant-numeric:tabular-nums}\n.repo-link{margin:2px 0 8px;font-size:13px}\n</style></head>\n' + THEME_HEAD + '<body>\n<header>\n<h1>Blue-Whale-Harness · DSH 插件总表（中英双语）</h1>\n<div class="repo-link"><a href="' + REPO_URL + '" target="_blank" rel="noopener">📦 源码仓库 · Blue-Whale-Harness</a></div>\n<div class="bar">\n<input type="search" id="q" placeholder="搜索仓库 / 意图 / 分类 / 技术栈…">\n<select id="cat"><option value="">全部分类</option></select>\n<select id="dsh"><option value="">全部</option><option value="yes">仅真·DSH</option><option value="no">仅非DSH</option></select>\n<select id="sort"><option value="stars">按 STAR</option><option value="forks">按 FORK</option><option value="created">按创建时间</option><option value="updated">按更新时间</option><option value="repo">按仓库名</option></select>\n<span class="stat" id="cnt"></span>\n<button class="theme-btn" id="themeBtn"></button>\n</div>\n</header>\n<table><thead><tr>\n' + comboHead + '\n</tr></thead><tbody id="tb"></tbody></table>\n'
  + '<script>\n'
  + 'const DATA=__DATA__;\n'
  + 'const catSel=document.getElementById("cat"),dshSel=document.getElementById("dsh"),q=document.getElementById("q"),sortSel=document.getElementById("sort"),tb=document.getElementById("tb"),cnt=document.getElementById("cnt");\n'
  + '[...new Set(DATA.map(d=>d.category))].sort().forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;catSel.appendChild(o)});\n'
  + 'let sortDir=-1;\n'
  + 'function esc(s){return (s||"").replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}\n'
  + comboRow + '\n'
  + 'function render(){\n const qv=q.value.toLowerCase(),cv=catSel.value,dv=dshSel.value,sk=sortSel.value;\n let rows=DATA.filter(d=>(!cv||d.category===cv)&&(!dv||d.isDsh===dv)&&(!qv||(d.repo+" "+d.intentZh+" "+d.intentEn+" "+d.category+" "+d.tech+" "+d.language).toLowerCase().includes(qv)));\n rows.sort((a,b)=>{let x=a[sk],y=b[sk];if(sk==="repo"||sk==="created"||sk==="updated"){x=String(x);y=String(y);return sortDir*x.localeCompare(y);}return sortDir*((x||0)-(y||0));});\n tb.innerHTML=rows.map(rowHtml).join("");\n cnt.textContent=rows.length+" / "+DATA.length+" 个";\n}\n'
  + 'q.oninput=render;catSel.onchange=render;dshSel.onchange=render;sortSel.onchange=render;\n'
  + 'document.querySelectorAll("th[data-k]").forEach(th=>th.onclick=()=>{sortSel.value=th.dataset.k;sortDir*=-1;render();});\n' + THEME_JS + 'render();\n'
  + '</script></body></html>\n'
writeFileSync(join(PAGES, 'index.html'), comboHtml.replace('__DATA__', dataJson))

console.log(`Generated (${totalN} rows, ${dshN} DSH, ${clonedN} cloned):
  pages/plugins.csv (both intent columns)
  catalog/plugins.md  (combined bilingual)
  pages/index.html  (combined bilingual)
  catalog/plugins.zh.md / pages/plugins.zh.html  (中文版)
  catalog/plugins.en.md / pages/plugins.en.html  (English version)`)
