// return promise by callback node-callback-style handler
function npCall(callback, args, ctx) {
    args = args || [];

    return new Promise((resolve, reject) => {
        args.push((err, ret) => {
            if (err) return reject(err);
            return resolve(ret);
        });

        callback.apply(ctx, args);
    });
}

module.exports = npCall;
