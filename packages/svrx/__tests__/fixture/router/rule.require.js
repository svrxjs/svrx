const bodyParserRelative = require('./node_modules/koa-bodyparser'); //relative path
const bodyParser = require('koa-bodyparser');

post('/test/post').to.handle(bodyParser()).handle((ctx) => {
  ctx.type = 'html';
  ctx.body = ctx.request.body;
});
post('/test/post/relative').to.handle(bodyParserRelative()).handle((ctx) => {
  ctx.type = 'html';
  ctx.body = ctx.request.body;
});
