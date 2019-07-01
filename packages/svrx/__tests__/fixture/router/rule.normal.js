

get('/hello/:name').to.send('<html>hello world</html>');

get('/blog/:id').json({ code: 200 });
