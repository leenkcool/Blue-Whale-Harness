# Blue-Whale-Harness Pages

Blue-Whale-Harness 的在线站点目录，`pages/` 下的站点文件均由 [catalog/generate.mjs](../catalog/generate.mjs) 从 `catalog/` 数据自动生成，由 GitHub 工作流负责部署并回写快照。

🌐 访问：**https://leenkcool.github.io/Blue-Whale-Harness**

## 文件

| 文件 | 说明 |
|---|---|
| `index.html` | DSH 插件总表（中英双语意图，可搜索 / 分类筛选 / 按 STAR 排序） |
| `plugins.zh.html` | 中文版 |
| `plugins.en.html` | English version |
| `plugins.csv` | 原始数据 |
| `README.md` | 本说明（唯一手写维护的文件） |

## 自动流程

[.github/workflows/deploy.yml](../.github/workflows/deploy.yml) 在 push 到 `main` 且改动 `catalog/**`（或手动 `workflow_dispatch`）时执行：

1. **构建**：拉取仓库 → 安装 Node.js 24（LTS）→ 运行 `node catalog/generate.mjs` 生成 `pages/` 产物
2. **部署**：上传 `./pages` → `deploy-pages` 发布到 GitHub Pages
3. **回写**：以 `github-actions[bot]` 身份把产物 commit 回 `main` 的 `pages/`（`[skip ci]`），形成随仓库保存的快照，供开发者离线查看 / 仓库内检视

本地预览：`node catalog/generate.mjs`（与 CI 相同的生成命令）。

## 维护规则

- **不要手动维护** `index.html`、`plugins.*.html`、`plugins.csv`：它们是自动产物，手动改动会在下一次同步时被覆盖；更新站点内容请修改 `catalog/` 源文件并 push。
- ⚠️ **高危：不得修改 `deploy.yml` 的触发条件**（`paths` 仅限 `catalog/**`）。若加入 `pages/**` 或去掉过滤，回写提交会再次触发构建，形成「构建 → 回写 → 再触发」的无限循环。