#!/usr/bin/env node
/**
 * build-readme.mjs — generate the Blue-Whale-Harness README.md from intents.json.
 *
 * Produces a categorized index of every collected DSH plugin repo, links each
 * to its GitHub repo, and links the whole thing to the live site.
 *
 * Run: node build-readme.mjs   (writes ../README.md)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const intents = JSON.parse(readFileSync(join(__dirname, 'intents.json'), 'utf8'))

const clean = s => (s || '').toString().replace(/\r?\n/g, ' ').trim()
const rows = Object.values(intents).map(r => ({
  repo: r.repo,
  url: `https://github.com/${r.repo}`,
  intentZh: clean(r.intentZh || '').slice(0, 90),
  intentEn: clean(r.intentEn || '').slice(0, 90),
  category: r.dshCategory || 'uncategorized',
  isDsh: r.isDshPlugin ? 'yes' : 'no',
  stars: r.stars ?? 0,
  language: r.language || '',
}))
rows.sort((a, b) => b.stars - a.stars)

const total = rows.length
const dshN = rows.filter(r => r.isDsh === 'yes').length
const date = new Date().toISOString().slice(0, 10)

// group by category, sort categories by total stars desc
const byCat = {}
for (const r of rows) (byCat[r.category] ||= []).push(r)
const cats = Object.keys(byCat).sort((a, b) => byCat[b].reduce((s, x) => s + x.stars, 0) - byCat[a].reduce((s, x) => s + x.stars, 0))

const L = []
L.push('# Blue-Whale-Harness')
L.push('')
L.push(`[![Stars](https://img.shields.io/github/stars/leenkcool/Blue-Whale-Harness?style=flat-square)](https://github.com/leenkcool/Blue-Whale-Harness/stargazers) [![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](./LICENSE) [![Last commit](https://img.shields.io/github/last-commit/leenkcool/Blue-Whale-Harness?style=flat-square)](https://github.com/leenkcool/Blue-Whale-Harness/commits/main) [![Plugins](https://img.shields.io/badge/repos-${total}-orange?style=flat-square)](https://leenkcool.github.io) [![Online catalog](https://img.shields.io/badge/site-leenkool.github.io-brightgreen?style=flat-square)](https://leenkcool.github.io)`)
L.push('')
L.push('> **DeepSeek Harness（DSH）插件总目录** — 收录 GitHub 上散落各处的 DSH 插件、Skill、MCP Server 与周边工具，逐个校验「是否为真插件」，并做成可搜索、可筛选、可导出的在线总表。')
L.push('')
L.push('🌐 **在线总表：[leenkcool.github.io](https://leenkcool.github.io)** — 中英文搜索、分类筛选、按 STAR 排序、CSV 导出。')
L.push('')
L.push(`> 自动生成于 ${date} ｜ 共 **${total}** 个仓库 ｜ 真·DSH 插件 **${dshN}** 个 | QQ Group:839509497 |Tg Group: [http://t.me/deepseekdsh](http://t.me/deepseekdsh)`)
L.push('')
L.push('### 怎么用')
L.push('')
L.push('1. **找插件** — 直接开 [在线总表](https://leenkcool.github.io)，按关键词 / 分类 / STAR 检索，比翻 README 快得多。')
L.push('2. **翻清单** — 不想开网页就往下看「插件清单」，或下载 [plugins.csv](https://leenkcool.github.io/plugins.csv) 自己筛。')
L.push('3. **提交收录** — 发一个 issue（模板 `catalog-intake`）写出仓库地址与分类，或按 `repos.txt` 格式提 PR。')
L.push('')
L.push('> 收录标准：仓库含 `cordis.patch.yml` 判为**真·DSH 插件**，其余按「相关生态」单独标记，两者都进表、不混算。')
L.push('')
L.push('')
L.push('![频道](https://leenkcool.github.io/pindaoh.png)')
L.push('')
L.push('## 统计')
L.push('')
L.push(`- 仓库总数：**${total}**`)
L.push(`- 真·DSH 插件：**${dshN}**`)
L.push(`- 在线浏览：https://leenkcool.github.io （[中文版](https://leenkcool.github.io/plugins.zh.html) ｜ [English](https://leenkcool.github.io/plugins.en.html) ｜ [CSV 数据](https://leenkcool.github.io/plugins.csv)）`)
L.push('')
L.push('## 分类索引')
L.push('')
for (const c of cats) {
  const n = byCat[c].length
  const st = byCat[c].reduce((s, x) => s + x.stars, 0)
  L.push(`- **${c}** — ${n} 个仓库，★${st}`)
}
L.push('')
L.push('## 插件清单')
L.push('')
L.push('> 按分类分组，组内按 STAR 倒序。点击仓库名即可跳转原项目。')
L.push('')
for (const c of cats) {
  L.push(`### ${c}（${byCat[c].length}）`)
  L.push('')
  L.push('| 仓库 | 意图(中文) | Intent(English) | STAR | 语言 | 真DSH |')
  L.push('|---|---|---|---|---|---|')
  for (const r of byCat[c]) {
    L.push(`| [${r.repo}](${r.url}) | ${r.intentZh} | ${r.intentEn} | ${r.stars} | ${r.language} | ${r.isDsh} |`)
  }
  L.push('')
}
L.push('## 如何生成 / 更新')
L.push('')
L.push('```bash')
L.push('node catalog/analyze.mjs     # 采集仓库元数据 + 意图（HY3 直译）')
L.push('node catalog/merge.mjs       # 套用人工翻译')
L.push('node catalog/generate.mjs    # 生成 catalog/index.html 等网站产物')
L.push('node catalog/build-readme.mjs # 重新生成本 README')
L.push('```')
L.push('')
L.push('生成的网站产物部署到 [leenkcool.github.io](https://github.com/leenkcool/leenkcool.github.io)。')
L.push('')
L.push('## License')
L.push('')
L.push('插件清单索引按 Apache-2.0 收集整理；各插件版权归原作者所有。')
L.push('')
L.push('---')
L.push('')
L.push('')
L.push('![频道](https://leenkcool.github.io/pindaoh.png)')

writeFileSync(join(ROOT, 'README.md'), L.join('\n') + '\n')
console.log(`README written: ${total} repos, ${cats.length} categories -> ${join(ROOT, 'README.md')}`)
