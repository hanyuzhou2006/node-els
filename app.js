var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(server);
var Game = require('./els.js');
if (process.env.RECORD === 'aly') {
  var Record = require('./record.aly.js');
} else {
  var Record = require('./record.local.js');
}


var fs = require("fs");

var high = -1;

var game = new Game();
var gameString = '';
var record = new Record();
var onlines = 0;
app.use(express.static(__dirname + '/public'));
if (process.env.RECORD !== 'aly') app.use(record.fileHost, express.static(__dirname + '/' + record.dst));
app.get('/fileHost', function (req, res) {
  res.send(record.fileHost);
});


//日期格式化，全局
Date.prototype.format = function (format) {
  if (!format) format = 'yyyy/MM/dd hh:mm:ss';
  var o = {
    "M+": this.getMonth() + 1, //month
    "d+": this.getDate(),    //day
    "h+": this.getHours(),   //hour
    "m+": this.getMinutes(), //minute
    "s+": this.getSeconds(), //second
    "q+": Math.floor((this.getMonth() + 3) / 3),  //quarter
    "S": this.getMilliseconds() //millisecond
  }

  if (/(y+)/.test(format)) {
    format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  }

  for (var k in o) {
    if (new RegExp("(" + k + ")").test(format)) {
      format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
    }
  }
  return format;
}


record.getFile('info.txt', function (err, data) {
  if (err) {
    high = -1;

  } else {

    var callback = function (data) {
      return parseInt(data.split(',')[0]);
    }
    high = eval(data.toString('utf-8'));
  }
  console.log(new Date().format(), ': 最高分:', high);
});



game.on('start', function () {
  console.log(new Date().format() + ': game start');
  game.last = Date.now();
  record.init();
  game.auto();
});

game.on('auto', function () {
  // console.log('auto');
});
game.on('end', function () {
  console.log(new Date().format() + ': game end');

  if (high < game.score) {
    //更新最高分
    high = game.score;
    record.hirs.push(String(game.score));
    record.hirs.push(',');
    record.hirs.push(String(record.index));
    record.hirs.push(null);

    record.strs.push(null, function () {
      record.setCopy();
      record.end = 1;
      record.callback();
    });
  } else {
    record.strs.push(null);
  }
});
game.on('status', function () {

  gameString = game.toCompress();
  io.emit('cdata', gameString);
  var now = Date.now();
  if (record.count == 100) {
    record.count = 0;
    record.changeIndex();
  }

  record.strs.push(String(now - game.last));
  record.strs.push(',');
  record.strs.push(game.score.toString());
  record.strs.push(',');
  record.strs.push(gameString);
  record.strs.push(';');
  game.last = now;
  record.count++;
})
game.on('moved', function (params) {
  game.emit('status');
});

game.on('update', function () {
  game.emit('status');
});
game.on('score', function (length) {
  //得分规则
  var score = 0;
  switch (length) {
    case 1: score = 1; break;
    case 2: score = 3; break;
    case 3: score = 6; break;
    case 4: score = 10; break;
  }
  game.score += score;
  try {
    if (game.score < Game.scores[Game.scores.length - 1]) {
      if (game.score >= Game.scores[game.level]) {
        game.levelUp();
        console.log(new Date().format(), ': level up to ', game.level);
      }
    }
  } catch (e) {
    console.log(new Date().format(), ': error:', e);
  }


  io.emit('score', [score, game.score]);
});




var user = null;
io.on('connection', function (socket) {
  onlines++;
  socket.emit('control', user);
  socket.emit('cdata', gameString);
  socket.emit('score', [game.score, game.score]);
  io.emit('inline', socket.id);
  io.emit('onlines', onlines);
  socket.on('op', function (code) {
    if (user == socket.id) {
      game.op(code);
    }
  });
  socket.on('play', function () {
    if (game.status) {
      if (user == null) {
        user = socket.id;
        io.emit('control', socket.id);
      }
    }
    else {
      user = socket.id;
      game.start();
      io.emit('score', [game.score, game.score]);
      io.emit('start', socket.id);

    }
  });
  socket.on('comment', function (comment) {
    io.emit('comment', comment, socket.id);
  })
  socket.on('disconnect', function () {
    onlines--;
    io.emit('onlines', onlines);
    io.emit('unline', socket.id);
    if (user == socket.id) {
      user = null;
      io.emit('uncontrol', socket.id);
    }

  });
});

var port = process.env.PORT || 8080;
server.listen(port);