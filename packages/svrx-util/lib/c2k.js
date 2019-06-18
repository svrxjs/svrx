/**
 * 
   License
   MIT
   https://github.com/cyrilluce/koa2-connect#readme

   ## Fork chain
    - Copyright (c) 2014-present Vladimir Kurchatkin
    - Copyright (c) 2017-present cyrilluce
    - Copyright (c) 2019-present leeluolee
 */

/**
 * The middleware function does include the `next` callback so only resolve
 * the Promise when it's called. If it's never called, the middleware stack
 * completion will stall
 */
function handler(ctx, connectMiddleware, options) {
    options = options || {};

    return new Promise((resolve, reject) => {
        function makeInjectedResponse(koaCtx, whenEnded) {
            const res = koaCtx.res;

            res.on('close', whenEnded).on('finish', whenEnded);

            // koa2.0 initial assign statusCode to 404, default reset it to 200
            let dummyRes = res.__dummyRes;
            if (!dummyRes) {
                let statusCodeSetted = false;
                const default404to200 = function() {
                    if (!statusCodeSetted && res.statusCode === 404) {
                        res.statusCode = 200;
                    }
                };
                let buffer = Buffer.from([]);
                dummyRes = res.__dummyRes = {
                    __proto__: res,
                    end(cnt) {
                        default404to200();

                        if (options.bubble) {
                            ctx.body = cnt ? Buffer.concat([buffer, Buffer.from(cnt)]) : buffer;
                            resolve(false); // can't trigger finish or end
                        } else {
                            return res.end.apply(res, arguments);
                        }
                    },
                    write(cnt) {
                        default404to200();
                        if (options.bubble) {
                            buffer = Buffer.concat([buffer, Buffer.from(cnt)]);
                        } else {
                            return res.write.apply(res, arguments);
                        }
                    },
                    set statusCode(v) {
                        statusCodeSetted = true;
                        res.statusCode = v;
                    },
                    get statusCode() {
                        return res.statusCode;
                    },
                    writeHead(statusCode) {
                        statusCodeSetted = true;
                        return res.writeHead.apply(res, arguments);
                    },
                    setHeader() {
                        ctx.set.apply(ctx, arguments);
                    }
                };
            }

            return dummyRes;
        }
        // (req, res)
        const args = [
            ctx.req,
            makeInjectedResponse(ctx, () => {
                resolve(false);
            })
        ];
        let assumeSync = true;
        // (req, res, next) or (err, req, res, next)
        if (connectMiddleware.length >= 3) {
            args.push((err) => {
                if (err) reject(err);
                else resolve(true);
            });
            assumeSync = false;
        }
        // (err, req, res, next)
        if (connectMiddleware.length >= 4) {
            args.unshift(null);
        }
        connectMiddleware.apply(null, args);
        /**
         * If the middleware function does not declare receiving the `next` callback
         * assume that it's synchronous.
         */
        if (assumeSync) {
            resolve(true);
        }
    });
}

/**
 * Returns a Koa middleware function that varies its async logic based on if the
 * given middleware function declares at least 3 parameters, i.e. includes
 * the `next` callback function
 */
function koaConnect(connectMiddleware, options) {
    return async (ctx, next) => {
        // ctx.respond = false;
        try {
            const goNext = await handler(ctx, connectMiddleware, options);

            if (goNext) {
                // ctx.respond = true;
                return next();
            }
        } catch (err) {
            ctx.respond = true;
            throw err;
        }
    };
}

module.exports = koaConnect;
