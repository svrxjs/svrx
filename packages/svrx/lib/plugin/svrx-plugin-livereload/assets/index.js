void (function(svrx) {
    var io = svrx.io;

    function addListener(el, type, cb) {
        if (el.addEventListener) return el.addEventListener(type, cb, false);
        else if (el.attachEvent) return el.attachEvent('on' + type, cb);
    }

    // autoreload
    var autoreload = function() {
        const stylesheets = document.getElementsByTagName('link');

        const cacheBuster = function(url) {
            var date = Math.round(+new Date() / 1000).toString();
            url = url.replace(/(\\&|\\\\?)cacheBuster=\\d*/, '');
            return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'cacheBuster=' + date;
        };
        const updateStyle = function(stylePathName) {
            for (var i = stylesheets.length; i--; ) {
                var href = stylesheets[i].getAttribute('href');
                stylesheets[i].setAttribute('href', cacheBuster(href));
            }
            return true;
        };

        io.on('file:change', function(data) {
            if (data.css && updateStyle(data.css)) return true;

            const evt = { stop: false, path: data.path };
            svrx.events.emit('livereload:update', evt);
            if (!evt.stop) {
                window.location.reload();
            }
        });
    };

    addListener(window, 'load', autoreload);
})(window.__svrx__);
