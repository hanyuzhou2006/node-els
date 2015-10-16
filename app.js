/// <reference path="typings/node/node.d.ts"/>
var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(server);
var Game = require('./els.js');
var Record = require('./record.js');
var fs = require("fs");
var high = -1;

var game = new Game();
var gameString = '';
var record = null;
/*
 * 复制目录中的所有文件包括子目录
 * @param{ String } 需要复制的目录
 * @param{ String } 复制到指定的目录
 */
var copy = function (src, dst) {
  // 读取目录中的所有文件/目录
  fs.readdir(src, function (err, paths) {
    if (err) {
      throw err;
    }
    paths.forEach(function (path) {
      var _src = src + '/' + path,
        _dst = dst + '/' + path,
        readable, writable;

      fs.stat(_src, function (err, st) {
        if (err) {
          throw err;
        }

        // 判断是否为文件
        if (st.isFile()) {
          // 创建读取流
          readable = fs.createReadStream(_src);
          // 创建写入流
          writable = fs.createWriteStream(_dst);  
          // 通过管道来传输流
          readable.pipe(writable);
        }
        // 如果是目录则递归调用自身
        else if (st.isDirectory()) {
          exists(_src, _dst, copy);
        }
      });
    });
  });
};
// 在复制目录前需要判断该目录是否存在，不存在需要先创建目录
var exists = function (src, dst, callback) {
  fs.exists(dst, function (exists) {
    // 已存在
    if (exists) {
      callback(src, dst);
    }
    // 不存在
    else {
      fs.mkdir(dst, function () {
        callback(src, dst);
      });
    }
  });
};
var rm = function (src) {
  if (fs.existsSync(src)) {
    var st = fs.statSync(src); 
    // 判断是否为文件
    if (st.isFile()) {
      fs.unlinkSync(src);
    }
    // 如果是目录则递归调用自身
    else if (st.isDirectory()) {
      var paths = fs.readdirSync(src);
      for (var i = 0; i < paths.length; i++) {
        var _src = src + '/' + paths[i];
        rm(_src);
      }
      fs.rmdirSync(src);
    }
  }
};




app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/record'));
server.listen(80);



game.on('start', function () {
  console.log('game start');
  rm('current/');
  game.last = Date.now();
  record = new Record();
  game.auto();
});

game.on('auto', function () {
  // console.log('auto');
});
game.on('end', function () {
  console.log('game end');
  record.strs.push(null);
  record.hirs.push(String(game.score));
  record.hirs.push(',');
  record.hirs.push(String(record.index));
  record.hirs.push(null);
  if (high < game.score) {
    //更新最高分
    high = game.score;
    //-*--------------------------------
    exists('./current', './record', copy);

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
  if (game.score < Game.scores[Game.scores.length - 1]) {
    if (game.score >= Game.scores[game.level]) {
      game.levelUp();
    }
  }

  io.emit('score', [score, game.score]);
});

try {
  var highText = fs.readFileSync('./record/high.txt', 'utf-8');
  high = parseInt(highText.split(',')[0]);
} catch (e) {
  high = -1;
}

var user = null;
io.on('connection', function (socket) {
  socket.emit('control', user);
  socket.emit('cdata', gameString);
  socket.emit('score', [game.score, game.score]);
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
      io.emit('start', socket.id);
    }
  });

  socket.on('disconnect', function () {
    if (user == socket.id) {
      user = null;
    }
    io.emit('uncontrol', socket.id);

  });
});


