

get('/hello/:name').to.send('<html>hello world</html>');

get('/normal/:id').json({ code: 200 });
