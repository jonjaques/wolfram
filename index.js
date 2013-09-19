var dom = require('xmldom').DOMParser,
    xpath = require('xpath'),
    request = require('request'),
    util = require('util')

var Client = exports.Client = function Client(appKey) {
  this.appKey = appKey
}

Client.prototype.query = function(input, cb) {
  if(!this.appKey) {
    return cb("Application key not set", null)
  }

  var tpl = 'http://api.wolframalpha.com/v2/query?input=%s&primary=true&appid=%s'
  var uri = util.format(tpl, encodeURIComponent(input), this.appKey)

  request(uri, function(error, response, body) {
    if(!error && response.statusCode == 200) {
      var doc = (new dom().parseFromString(body, 'text/xml')),
          root = doc.documentElement

      if (xpath.select('@error', root)[0].value != 'false') {
        var message = xpath.select('//error/msg/text()', root).toString();
        return cb(message, null)
      } else {
        var pods = xpath.select('//pod', root).map(function(pod) {
          var subpods = xpath.select('//subpod', pod).map(function(node) {
            return {
              title: xpath.select('@title', node)[0].value,
              value: xpath.select('plaintext/text()', node).toString(),
              image: xpath.select('img/@src', node)[0].value
            }
          })
          var primary = (function() {
            var p = xpath.select('@primary', pod)
            return (p[0] && p[0].value == 'true') ? true : false
          })()
          return { subpods: subpods, primary: primary }
        })
      }
      return cb(null, pods)
    } else {
      return cb(error, null)
    }
  })
}

exports.createClient = function(appKey) {
  return new Client(appKey)
}
