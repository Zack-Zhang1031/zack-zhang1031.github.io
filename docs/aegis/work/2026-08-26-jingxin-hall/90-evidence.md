# Jingxin Hall execution evidence

## Baseline

- `git worktree add E:\Github\.codex-worktrees\zack-site-jingxin-hall -b feature/jingxin-hall c7c0914` succeeded.
- `npm ci` added 463 locked packages and exited `0`.
- `npm run build` exited `0`, generated 52 pages, and created `dist/sitemap-index.xml`.

## Task evidence

Further command, test, source, privacy, integrity, deployment, and live-smoke evidence is appended after each verified slice.

## Task 8 evidence — three 100-lot collections (2026-08-28)

- 观音灵签：好查网古典批注转录（宫位/诗意/解曰/仙机/典故）为底，与 dcwml/suanming-zhanbu-worker `guanyin.zh.js` 互校；等级分布上签22/中签60/下签18 与该校勘文档一致；37 签存在单字级异文时取 zh.js 多源定本。
- 吕祖灵签：好查网与易安居双站转录互校，99/100 签诗完全一致；第 76 签好查网缺页，以易安居为底并在版本说明中记录。
- 关帝灵签：好查网通行古本（干支/等级/圣意/解曰/释义/东坡解/碧仙注）为底，与维基文库《關聖帝君靈籤》互校，签诗字符一致率 94.87%（差异均为版本异文，如 誰道/谁识、祷告/祷祝）。
- 分层抽样审计：每套 12 签共 36 条，TS 数据与原始抓取来源逐字比对，36/36 通过。
- 现代简释 741 条全部为本项目原创 hedged 改写，生成时机械扫描禁语（必定/必然/注定/宿命/铁口/一定会/包你/血光/灾祸/改命/转运/灵验/保佑）零命中；禁语仅出现在公有领域古典原文转录中。
- 台账 lots-guanyin / lots-luzu / lots-guandi 转 verified，校验和为最终 TS 产物 sha256。
- `lots.test.ts` 11 项：三套各 100 条、编号 1-100 唯一、tradition 正确、来源元数据、禁语扫描、跨集对象不复用、注入随机源公平索引映射、掷筊映射。
- E2E `jing-chouqian.spec.ts` 7 项：三套抽签、干支展示、掷筊不覆盖原签、30 秒冷静期重抽警告、换套保留展示、零外部请求、390px 无溢出。

## Task 9 evidence — route assembly and release verification (2026-08-28)

- `vitest run`：16 文件 177 测试全部通过。
- `astro check`：0 errors / 0 warnings。
- `astro build`：62 页面构建成功。
- `playwright test`：57 测试全部通过（含新增 `jing-routes.spec.ts` 12 项：十条路由私密外壳、无公共导航/评论/账号/追踪元素、无外部请求、reduced-motion 等价内容、首页九房间链接）。
- dist 检查：十条 /jing/ 路由全部生成；`sitemap-0.xml` 无 /jing/ 条目；jing 页面 `noindex,nofollow`；无外部字体/追踪 URL（仅维基共享资源署名链接）；音频均为 opt-in 懒加载（木鱼 8KB，环境音 624-712KB 只在显式开启后请求）；圣像 232-356KB webp。
- 残余风险（非阻塞）：吕祖签底本为现代站点互校转录而非刻本影像，若日后取得道光二十六年刻本扫描件可再校；关帝签 50 签存在单字级版本异文，已在台账记录。

## Deployment evidence (2026-08-28)

- 合并 `d590377 [jing] merge: complete jingxin hall into main`：7 个冲突文件全部解决（astro.config.mjs 保留 main 新域名 `zk.lz1031.workers.dev` + 并入 /jing/ sitemap 过滤；BaseLayout/global.css 保留双方改动；文档取 main 新版，INDEX 并集）。合并树重跑：177 单测 + 57 E2E + astro check 0 errors + 103 页面构建。
- 推送 `8e9b1eb..d590377 merge/jingxin -> main`；Cloudflare Workers Git 集成自动构建。
- 线上只读冒烟：`/jing/` 及九个房间全部 200；页面含 `noindex,nofollow`；首页页脚恰好一个 `静` 印章入口；线上 sitemap 无 /jing/ 条目。
- 注意：主站域名已于 main 更名为 `https://zk.lz1031.workers.dev`（计划中 `z.zz1031.workers.dev` 为旧地址，未改动该设置）。
