# svrx | server-x

platform built for efficient front-end development

## Options

### livereload

`boolean`, `object`

Enable/disable auto page live reload.
Livereload is enabled by default.

#### livereload.exclude

`string`, `string[]`

Specify patterns to exclude from file watchlist. 
If a file matches any of the excluded patterns, the file change won’t trigger page reload.

### serve

`boolean`, `object`

The set of dev server options. 

#### serve.base

`string`

Tell the server where to serve static content from. By default, we'll looking for contents at the current working path. 
This option is necessary only when you want to serve static files. 

#### serve.serveIndex 

`boolean`

Enable/disable `serveIndex middleware`. `serveIndex` is enabled by default.

`serveIndex middleware` displays a view of directory if your content base not contains a `index.html`.

#### serve.historyApiFallback

`boolean`, `object`

Enable/disable `historyApiFallback middleware`. It is set to `false` by default.

This option is necessary when your app is using [HTML5 History API](https://developer.mozilla.org/en-US/docs/Web/API/History), 
`historyApiFallback middleware` will serve a `index.html` page instead of 404 responses. 

### proxy

`boolean`, `object`, `object[]`

Proxing urls when you want to send some requests to different backend servers on the same domain.

```js
module.exports = {
    proxy: {
        '/api': {
            target: 'http://you.backend.server.com'  
        }
    },
}
```

Now a request to `/api/path` will be proxied to `http://you.backend.server.com/api/path`.

And you can also rewrite the path, eg:

```js
module.exports = {
    proxy: {
        '/api': {
            target: 'http://you.backend.server.com',
            pathRewrite: {'^/api' : ''} 
        }
    },
}
```

Then your request to `/api/path` will be proxied to `http://you.backend.server.com/path`.

A backend server running on HTTPS with an invalid certificate will not be accepted by default.
If you want to, modify your config like this:

```js
module.exports = {
    proxy: {
        '/api': {
            target: 'https://you.https.server.com',
            secure: false 
        }
    },
}
```

If you want to proxy multiple pathes to a same target, try:

```js
module.exports = {
    proxy: [
        {
            context: ['/api', '/wapi', '/pub'],
            target: 'http://you.backend.server.com',
        }  
    ],
}
```

If you want to change the origin of host header to the target hostname, just set `changeOrigin` to `true`:

```js
module.exports = {
    proxy: {
        '/api': {
            target: 'https://you.https.server.com',
            changeOrigin: true 
        }
    },
}
```

### cors

`boolean`, `object`

Enable/disable cross-origin resource sharing([CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)).
Cors is enabled by default. 

svrx makes use of [koa2-cors](https://github.com/zadzbw/koa2-cors) package.
Check out its [option documentation](https://github.com/zadzbw/koa2-cors#options) for more advanced usages.

```js
module.exports = {
    // cors: false, disable cors
    cors: {
        origin(ctx) {
            if (ctx.url === '/test') {
                return false;
            }
            return '*';
        },
        exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 5,
        credentials: true,
        allowMethods: ['GET', 'POST', 'DELETE'],
        allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
    },
}
```
