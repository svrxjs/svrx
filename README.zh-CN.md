<p align="center">
  <img width="320" src="https://svrx.io/assets/images/banner.png">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/svrx">
    <img src="https://img.shields.io/npm/v/@svrx/svrx?style=flat-square" alt="svrx">
  </a>
  <a href="https://nodejs.org/en/">
    <img src="https://img.shields.io/node/v/@svrx/svrx?style=flat-square" alt="node">
  </a>
  <a href="https://travis-ci.org/svrxjs/svrx" rel="nofollow">
    <img src="https://img.shields.io/travis/svrxjs/svrx/master?style=flat-square&logo=travis" alt="Build Status">
  </a>
  <a href="https://codecov.io/gh/svrxjs/svrx">
    <img src="https://img.shields.io/codecov/c/gh/svrxjs/svrx?style=flat-square&logo=codecov" alt="codecov">
  </a>
  <a href="https://david-dm.org/svrxjs/svrx?path=packages%2Fsvrx">
    <img src="https://img.shields.io/david/svrxjs/svrx?path=packages%2Fsvrx&style=flat-square" alt="Dependencies">
  </a>
  <a href="https://david-dm.org/svrxjs/svrx?path=packages%2Fsvrx&type=dev">
    <img src="https://img.shields.io/david/dev/svrxjs/svrx?path=packages%2Fsvrx&style=flat-square" alt="DevDependencies">
  </a>
  <a href="https://gitter.im/svrxjs/svrx?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge">
    <img src="https://badges.gitter.im/svrxjs/svrx.svg" alt="gitter">
  </a>
</p>

中文 | [English](README.md) 

> A pluggable frontend server, it just works

Server-X(svrx) 是一个渐进且易于使用的、插件化的前端开发工作台。

## Motivation

作为前端开发，在不同的开发需求下，一般来说我们会有一套或者多套固定的开发环境。
它可能包括本地服务器以及各种用于调试工程的小工具。 
**维护这样的开发环境是很麻烦的**：
你不仅需要单独安装每一个工具，还需要对每一个工具进行设置。 
此外，针对不同的工程，你还需要有选择地去开启或关闭某个功能。

Server-X 做的，就是**利用插件机制来整合各种前端开发服务**， 
让前端开发者可以自由挑选所需的功能，如静态伺服、代理、远程调试等，
且**无需关心这些功能插件的安装过程**。 
有了 Server-X 这样一个轻量的前端开发工作台，
我们可以**轻松做到一份配置对应一套开发环境，实现真正的一键启动开发服务**。

## Features

🍻 在当前页 **静态伺服** 静态文件或者一个 SPA                
🐱 轻松实现 **代理转发**             
🏈 资源更改 **自动重载页面**             
🍀 **强大的插件机制**: 直接使用，无需安装               
🐥 **支持热重载的路由**: 永远不需要重启服务器               
🚀 **开发者套件** 快速开发自己的插件             
🎊 ...

![](https://svrx.io/assets/images/demo.gif)

这是一个简单的使用 Server-X 开启本地服务的例子，只需要一行命令：

```bash
svrx -p qrcode
```

每次代码改动后，只需要 `ctrl+s` 页面就会自动刷新（css 改动时页面支持 hotReload ）。
并且这里还使用了一个小插件叫做 `qrcode`，它会在页面右上角展示一个页面的二维码，方便移动端开发。
注意，你不需要自己安装任何插件，只需要声明它即可。 Server-X 会为你搞定一切！ 

## Quick Start

### 安装

```bash
npm install -g @svrx/cli
```

### 使用

开始前，首先你需要进入到你的工程目录，我们假设你的工程中已经有一个 `index.html`：

```bash
cd your_project
ls # index.html
```

无需经过任何配置和传参，直接运行 `svrx` 命令即可开启一个简单的本地服务器：

```bash
svrx
```

此时访问 http://localhost:8000 ，就可以看到 `index.html` 中的内容了。

![](https://svrx.io/assets/demo.png)

### 使用参数

如果需要对 `svrx` 进行配置，可以通过命令行传参来实现：

```bash
svrx --port 3000 --https --no-livereload
```

详细的参数列表可以在 [这里](https://docs.svrx.io/zh/guide/option.html) 查看。

### 配置持久化

当然，你也可以在你的工程目录下建立 `.svrxrc.js` 或 `svrx.config.js` 配置文件，将上面的命令行参数持久化下来：

```javascript
// .svrxrc.js
module.exports = {
  port: 3000,
  https: true,
  livereload: false
};
```

然后直接运行 `svrx` 命令， svrx 会自动读取你的配置文件。

## 核心功能 - 插件

再次声明，你不需要安装任何插件，直接使用即可！
Server-X 会帮你自动处理插件的安装、更新等等流程。

你可以通过命令行的方式去使用插件，例如：

```bash
svrx --plugin markdown -p qrcode # -p 是 --plugin 的缩写
svrx --markdown --qrcode         # 在命令行中设置某个插件名为 true 也可以快速开启一个插件
```

同样的，你也可以通过配置 `.svrxrc.js` 中的 plugins 字段来启用或配置插件，如：

```javascript
// .svrxrc.js
module.exports = {
  plugins: [
    'markdown',
    {
      name: 'qrcode',
      options: {
        ui: false,
      },
    },
  ],
};
```

[👉 查看全部插件](https://svrx.io/plugin?query=svrx-plugin-)

### 定制你的插件

如果很不幸，你暂时没有找到合适的满足你需求的 Server-X 插件，
你可以尝试使用我们的 [插件开发工具](https://github.com/svrxjs/svrx-create-plugin) 自己写一个小插件！
Server-X 作为一个纯粹的插件平台，帮你封装了绝大多数底层逻辑，你的插件编写将会变得非常容易。
像上面列表中的绝大多数插件，**核心代码都没有超过50行**！

那么 Server-X 的插件可以实现些什么呢？ 你可以：

- 往前端页面注入脚本代码、样式代码等等
    - eg： [vConsole 插件](https://github.com/svrxjs/svrx-plugin-vconsole) 、[qrcode 插件](https://github.com/svrxjs/svrx-plugin-qrcode) 
- 拦截后端请求，对数据进行编辑、转发
    - eg： [Mock.js 插件](https://github.com/svrxjs/svrx-plugin-mock) 、 [JSON-Server 插件](https://github.com/svrxjs/svrx-plugin-json-server)  

总之，Server-X 为你提供了强大的前后端代码注入能力，剩下的就靠你的创造力了。

关于插件的详细开发指南请阅读 [插件开发](https://docs.svrx.io/zh/plugin/contribution.html) 。

## 核心功能 - 动态路由

你可通过以下命令来快速尝试 Server-X 的动态路由功能。

```bash
touch route.js # create empty routing file
svrx --route route.js
```

在 `route.js` 中

```
get('/blog').to.json({ title: 'svrx' });
```

打开 `/blog`，你将看到 `{title: 'svrx'}` 的 json 输出。

动态路由功能具有以下特性：
  - 支持 hot reloading ( 通过编辑 route.js 来验证 )
  - 简单的书写，直观的阅读
  - 支持通过插件来[扩展和分发](https://docs.svrx.io/zh/guide/route.html#plugin)

除了返回 json，你还可以：

```
get('/handle(.*)').to.handle((ctx) => { ctx.body = 'handle'; });
get('/html(.*)').to.send('<html>haha</html>');
get('/rewrite:path(.*)').to.rewrite('/query{path}');
get('/redirect:path(.*)').to.redirect('localhost:9002/proxy{path}');
get('/api(.*)').to.proxy('http://mock.server.com/')
...
```

关于动态路由的语法和使用，可以在 [这里](https://docs.svrx.io/zh/guide/route.html) 找到更详细的说明。

## Documentation

你可以在 [这里](https://docs.svrx.io/zh/) 阅读更详细的使用文档、API 列表以及我们的博客。

## Support

如果你有任何问题、建议、bug，欢迎给我们 [提 Issue](https://github.com/svrxjs/svrx/issues/new/choose) 。

## Contributing

请阅读 [贡献指南](https://docs.svrx.io/zh/contribution.html) 。
