
/**
 * Module dependencies.
 */

var express     = require('express'),
    http        = require('http'),
    path        = require('path'),
    url         = require('url'),
    request     = require('request'),
    cheerio     = require('cheerio'),
    data        = require('./data.json'),
    kdTree      = require('./kdtree').kdTree,
    app         = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var tree = new kdTree(data.map(function(o) {
  return { w: o.deviation.w, h: o.deviation.h, obj: o };
}), function(a, b){
  return Math.pow(a.w - b.w, 2) +  Math.pow(a.h - b.h, 2);
}, ["w", "h"]);

var calcDeviation = function(args, callback) {
  if (typeof args.weight === 'undefined' ||
      typeof args.height === 'undefined' ||
      typeof args.age    === 'undefined') {
    return callback(new Error('insufficient arguments.'));
  }

  var weight = parseFloat(args.weight),
      height = parseFloat(args.height),
      age    = parseInt(args.age, 10),
      sex    = parseInt(args.sex, 10) == 1 ? 1 : 0;

  request.get({
    url: url.format({
      protocol: 'http:',
      host: 'konisimple.net',
      pathname: '/taikaku/result/',
      query: {
        sex: sex,
        age: age,
        height: height,
        weight: weight
      }
    })
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }
    try {
      $ = cheerio.load(body);
      var wDev = parseFloat($('.p1').find('.ss')[0].children[0].data),
          hDev = parseFloat($('.p1').find('.ss')[1].children[0].data);
      callback(null, { w: wDev, h: hDev });
    } catch(err) {
      callback(new Error('you set illigal data.'));
    }
  });
};

app.get('/monster', function(req, res) {
  res.render('monster');
});

app.get('/search', function(req, res) {
  calcDeviation(req.query, function(err, result) {
    if (err) {
      res.json(400, err);
    } else {
      var monster = tree.nearest(result, 1);
      console.log(monster);
      res.json(200, monster);
    }
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
