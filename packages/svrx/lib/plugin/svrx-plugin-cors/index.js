const cors = require('@koa/cors');

module.exports = {
    hooks: {
        // @TODO
        onRoute: cors()
    }
};
