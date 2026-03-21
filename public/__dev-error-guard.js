if (typeof window !== 'undefined') {
  (function () {
    function isWpErr(e) {
      if (!e) return false;
      var m = String(e.message || '');
      var s = String(e.stack || '');
      return (
        s.indexOf('options.factory') !== -1 ||
        s.indexOf('webpack_require') !== -1 ||
        (m.indexOf("reading 'call'") !== -1 && s.indexOf('webpack') !== -1)
      );
    }

    var _re = window.reportError;
    if (_re) {
      window.reportError = function (e) {
        if (!isWpErr(e)) return _re.call(window, e);
      };
    }

    var _ce = console.error;
    console.error = function () {
      for (var i = 0; i < arguments.length; i++) {
        var a = arguments[i];
        if (a && typeof a === 'object' && isWpErr(a)) return;
        if (
          a &&
          typeof a === 'string' &&
          a.indexOf('Invalid hook call') !== -1
        )
          return;
      }
      return _ce.apply(console, arguments);
    };

    window.addEventListener(
      'error',
      function (e) {
        if (isWpErr(e) || isWpErr(e && e.error)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }
      },
      true
    );

    window.addEventListener('unhandledrejection', function (e) {
      if (isWpErr(e && e.reason)) {
        e.preventDefault();
      }
    });
  })();
}
