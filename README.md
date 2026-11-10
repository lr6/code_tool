# 工具台

五个常用的开发者小工具，纯前端运行，所有转换都在浏览器里完成，不上传数据、不写 Cookies、无第三方请求。

- URL 编解码（encodeURIComponent / encodeURI / 解码）
- Unix 时间戳转换（秒与毫秒自动识别）
- JSON 格式化、压缩、校验、键排序
- Unicode 转义与 HTML 实体互转
- Base64（UTF-8 safe / URL-safe）

线上地址：https://tool.1475369.xyz

## 目录

```
public/
  index.html   页面结构
  app.css      样式
  app.js       工具逻辑
cloudflare.config.ts   Worker 配置（部署目标、自定义域名）
wrangler.config.ts     静态资源目录
```

## 本地开发

直接起一个静态服务器即可，没有构建步骤：

```sh
npm run serve
# 打开 http://127.0.0.1:8787
```

## 部署

```sh
npm install
cf deploy
```

`cf` 会用 Wrangler 打包 `public/` 目录并上传为 Workers 静态资源。首次部署会自动创建 Worker，`cloudflare.config.ts` 里的 `domains` 会把 `tool.1475369.xyz` 绑定到这个 Worker。

部署前可以先验证：

```sh
cf deploy --dry-run
```

## 说明

- 工具切换：`Alt + 1` 到 `Alt + 5`
- 所有输入实时转换，无需提交
- 复制按钮使用浏览器剪贴板 API，HTTP 环境下会退回 `execCommand('copy')`
