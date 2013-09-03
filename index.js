// Generated by CoffeeScript 1.6.3
/*

  Express adapter for Router

  2013 (c) Andrey Popp <8mayday@gmail.com>
*/

var __slice = [].slice;

var path = require('path'),
    express = require('express'),
    browserify = require('browserify'),
    _nowWeCanRequireJSX = require('./require_jsx'),
    Router = require('./router'),
    getCaller = require('./utils').getCaller;

function _genServerRenderingCode(module, props) {
  return [
    "var React = require('react-tools/build/modules/React');",
    "var Component = require(" + JSON.stringify(module) + ");",
    "React.renderComponentToString(",
    "Component(" + (JSON.stringify(props)) + "),",
    "function(str) { result = str; });"
  ].join('\n');
};

function _genClientRoutingCode(handler, request, routes) {
  return [
    "<script>",
      "(function() {",
        "var handler = require(" + JSON.stringify(handler) + ");",
        "var request = " + JSON.stringify(request) + ";",
        "var routes = " + JSON.stringify(routes) + ";",
        "var bootstrap = require('./bootstrap');",
        "for (var key in routes) {",
        "  routes[key] = require(routes[key]);",
        "}",
        "bootstrap(handler, request, routes);",
      "})();",
    "</script>"
  ].join('\n');
};

function renderComponent(module, props, root) {
  if (module[0] === '.') {
    module = path.resolve(root, module);
  }
  var code = _genServerRenderingCode(module, props);
  var context = {
    result: null,
    require: require
  };
  var contextify = require('contextify');
  contextify(context);
  context.run(code);
  context.dispose();
  return context.result;
};

function _insertScriptTag(markup, tag) {
  var index = markup.indexOf('</html>');
  if (index > -1) {
    return markup.slice(0, index) + tag + markup.slice(index);
  } else {
    return markup + scripts;
  }
};

function sendPage(routes, root) {
  return function(req, res, next) {
    var router = new Router(routes),
        match = router.match(req.path);

    if (match == null) {
      return next();
    }

    var request = {
      path: req.path,
      query: req.query,
      params: match.params
    };

    try {
      var rendered = renderComponent(match.handler, request, root);
      rendered = _insertScriptTag(rendered,
        '<script src="/__script__"></script>' +
        _genClientRoutingCode(match.handler, request, routes));
      return res.send(rendered);
    } catch (e) {
      return next(e);
    }
  };
};

function sendScript(routes, root) {
  return function(req, res, next) {
    var filename, module;
    res.setHeader('Content-Type', 'application/json');
    var b = browserify().transform('reactify').require('./bootstrap');
    for (var k in routes) {
      module = routes[k];
      filename = module[0] === '.' ? path.resolve(root, module) : module;
      b.require(filename, {expose: module});
    }
    return b.bundle({debug: true}, function(err, result) {
      if (err) {
        next(err);
      } else {
        res.send(result);
      }
    });
  };
};

module.exports = function(routes) {
  var root = path.dirname(getCaller());
  var app = express();

  app.get('/__script__', sendScript(routes, root));
  app.use(sendPage(routes, root));

  return app;
};