const path = require('path');

const config = {
    mode: 'production',
    entry: './client/index.js',
    output: {
        filename: 'index.js',
        path: path.join(__dirname, './assets/')
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            }
        ]
    }
};

module.exports = config;
