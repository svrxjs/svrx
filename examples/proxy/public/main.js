function onFetch(url) {
  fetch(url)
    .then(resp => resp.json())
    .then((result) => {
      console.log(result); // eslint-disable-line
      if (result && result.results) {
        const data = result.results[0];
        const info = {
          name: `${data.name.first} ${data.name.last}`,
          email: data.email,
        };
        const textarea = document.getElementById(url);
        textarea.value = Object.keys(info)
          .map(key => `${key}: ${info[key]}`)
          .join('\n');
      }
    });
}
