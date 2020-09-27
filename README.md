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

English | [中文](README.zh-CN.md)

> A pluggable frontend server, it just works

Server-X(svrx) is a platform built for efficient front-end development.

## Motivation

As a front-end developer, to meet different kind of development requirements, 
usually we will have one or more set of fixed development environment, 
in which may include a local dev server and many other debug tools. 
**It's difficult to maintain a development environment**: 
you need to install and configure every tool separately. 
Besides, you may also need to enable or disable a tool when switching among projects.

To solve the problem, we plan to **integrate all the development services and tools into a pluggable platform**,
and name it **Server-X(svrx)**. 
With Server-X, you can **freely pick and combine any services(plugins) you want**, 
like static serve, proxy, remote debugging and etc, 
without concerning about plugin installation.

Now, Server-X makes it possible for us to easily customize the development environment for each project, 
and **instead of downloading many other packages, all you need to do is just install Server-X**.

## Features

🍻  **Serve** a static site or SPA in current directory               
🐱 Easy to **proxy** everything             
🏈   **Auto refresh** the page on sources change(inline reload on stylesheets change)             
🍀   **Powerful plugins**: use without installation               
🐥   **Routing with hot reload**: never restart your server               
🚀   **Toolkit** for quick custom plugin development             
🎊  ...

![](https://svrx.io/assets/images/demo.gif)

Here's an example showing how to start a devServer with Server-X, 
only with a simple command:

```bash
svrx -p qrcode
```

After code change, just save the files to make sure livereload works.
And here's also a tiny plugin named `qrcode` to display a qrcode of this page.
Remember, you don't need to install any plugins, just declare it.

## Quick Start

### Install

```bash
npm install -g @svrx/cli
```

### Usage

Before we start, you need to cd into the root of your project first. Let's say you've already got an `index.html` in your project:

```bash
cd your_project
ls # index.html
```

And without any other config, just run `svrx` command to start the dev server:

```bash
svrx
```

Then visit http://localhost:8000 to see the content of index.html.

![](https://svrx.io/assets/demo.png)

### Command Line Options

You can pass options to change the default behavior through command line:

```bash
svrx --port 3000 --https --no-livereload
```

Check out the full option reference doc [here](https://docs.svrx.io/en/guide/option.html).

### .svrxrc.js

And also, you can write down all your options by creating a file named `.svrxrc.js` or `svrx.config.js` in the root path of your project.

```javascript
// .svrxrc.js
module.exports = {
  port: 3000,
  https: true,
  livereload: false
};
```

And then run `svrx` command, svrx will read your options from the config file automatically.

## Feature - Plugins

Again, you don't need to install any plugins, just use it! 
Server-X will handle everything(such as install, update...) for you.

You can use plugins through command line options, eg:

```bash
svrx --plugin markdown -p qrcode # -p is alias of --plugin
svrx --markdown --qrcode         # set a pluginName to true to start a plugin quickly
```

And also, you can enable and config a plugin through plugins in `.svrxrc.js` file, eg:

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

[👉 See all plugins](https://svrx.io/plugin?query=svrx-plugin-)

### Write Your Own Plugin

If, unluckily, you didn't find a proper plugin you need,
you can try write one with our [plugin-dev-tool](https://github.com/svrxjs/svrx-create-plugin) !  
As a pure plugin platform, Server-X encapsulates a lot of basic logic for you,
which makes it rather easy to write a new plugin.
By the way, in general, you can easily write a plugin with code **less than 50 lines**,
just like most of our published plugins.   

So what can we do through the plugins? We can:

- Inject code, script, styles into the front-end page
    - eg： [vConsole plugin](https://github.com/svrxjs/svrx-plugin-vconsole) 、[qrcode plugin](https://github.com/svrxjs/svrx-plugin-qrcode) 
- Intercept the backend requests, edit and proxy those data
    - eg： [Mock.js plugin](https://github.com/svrxjs/svrx-plugin-mock) 、 [JSON-Server plugin](https://github.com/svrxjs/svrx-plugin-json-server)  

Anyway, Server-X provides a powerful ability to inject both frontend and backend logic,
all you need to do is use it to create your own magic plugins. 

You can read more about plugin development [here](https://docs.svrx.io/en/plugin/contribution.html) .

## Feature - Routing

You can try the following commands to start Server-X routing quickly:

```bash
touch route.js # create empty routing file
svrx --route route.js
```

In your `route.js`

```
get('/blog').to.json({ title: 'svrx' });
```

Then open `/blog`, you'll see the json output `{title: 'svrx'}`.

Features of routing:
  - support hot reloading ( check it out by editing your route.js now)
  - easy writing, clear reading
  - support [expanding](https://docs.svrx.io/en/guide/route.html#plugin) through plugin

Besides return of json, you can also:

```
get('/handle(.*)').to.handle((ctx) => { ctx.body = 'handle'; });
get('/html(.*)').to.send('<html>haha</html>');
get('/rewrite:path(.*)').to.rewrite('/query{path}');
get('/redirect:path(.*)').to.redirect('localhost:9002/proxy{path}');
get('/api(.*)').to.proxy('http://mock.server.com/')
...
```

To learn more about the grammar and usage of Routing, click [here](https://docs.svrx.io/en/guide/route.html).

## Documentation

You can read more detail about the usage, API reference, blogs [here](https://docs.svrx.io/en/).

## Support

Feel free to [raise an issue](https://github.com/svrxjs/svrx/issues/new/choose).

## Contributing

Please see the [contributing guidelines](https://docs.svrx.io/en/contribution.html).
