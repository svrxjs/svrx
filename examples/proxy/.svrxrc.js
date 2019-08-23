module.exports = {
  serve: {
    base: './public',
  },
  proxy: [
    {
      context: ['/api', '/same'],
      target: 'https://randomuser.me',
      pathRewrite: {
        '/same/api': '/api'
      }
    }
  ],
};
