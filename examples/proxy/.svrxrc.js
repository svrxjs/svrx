module.exports = {
  serve: {
    base: './public',
  },
  proxy: [
    {
      context: ['/api', '/same'],
      target: 'https://randomuser.me',
      changeOrigin: true,
      pathRewrite: {
        '/same/api': '/api'
      }
    }
  ],
};
