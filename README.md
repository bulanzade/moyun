# 墨韵字帖

墨韵字帖是一个简单易用的网页应用，可以帮助用户快速创建个性化的中文书法练习字帖。

## 在线访问

**在线体验地址**：[https://bulanzade.github.io/moyun/](https://bulanzade.github.io/moyun/)

## 功能特点

- **字帖生成**：自动将输入的文字排版成书法练习格式
- **格式选择**：支持田字格和米字格两种格式
- **格子大小**：提供8格（大格）、10格（中格）、13格（标准）、15格（小格）和18格（细格）多种选择
- **字体样式**：支持粗体、正常两种字重显示
- **字体选择**：支持楷体、宋体、黑体、仿宋、隶书等多种系统字体
- **浅色参考**：每行首字为黑色，其余为浅色，便于临摹参考
- **浅色选择**：支持灰色、淡青、淡绿、淡红多种浅色选择
- **打印功能**：直接打印生成的字帖，方便使用
- **自动排版**：根据A4纸张尺寸自动优化排版，适合打印

## 安装与使用

### 本地安装

1. 克隆仓库到本地：
```bash
git clone https://github.com/bulanzade/moyun.git
cd moyun
```

2. 安装依赖：
```bash
pnpm install
```

3. 运行开发服务器：
```bash
pnpm run dev
```

4. 打开浏览器访问：`http://localhost:5173`

### 构建生产版本

```bash
pnpm run build
```

构建后的文件将位于 `dist` 目录，可以部署到任何静态网站服务器。

## 使用方法

1. 在文本框中输入需要练习的汉字或选择预设文本
2. 选择格式（田字格或米字格）
3. 选择每行格子数量
4. 设置字体粗细和浅色字体颜色
5. 点击"打印字帖"按钮打印生成的字帖

## 技术栈

- Vue 3
- TypeScript
- Canvas API

## 贡献指南

欢迎提交 Issues 和 Pull Requests 来帮助改进此项目。

1. Fork 本仓库
2. 创建您的特性分支: `git checkout -b my-new-feature`
3. 提交您的修改: `git commit -am 'Add some feature'`
4. 推送到分支: `git push origin my-new-feature`
5. 提交 Pull Request

## 许可证

本项目基于 [MIT 许可证](LICENSE) 发布。

## 开发计划

- 支持导出为PDF功能
- ~~支持下载为图片功能~~ (已完成)
- ~~添加更多字体选择~~ (已完成)
- 支持自定义背景颜色

## 联系方式

如有问题或建议，请提交Issue或Pull Request。
