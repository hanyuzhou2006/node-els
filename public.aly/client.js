

var Game = (function () {
  function Game() {

  }
  var types = [
    [0x0f00, 0x4444, 0x0f00, 0x4444],
    [0x04e0, 0x0464, 0x00e4, 0x04c4],
    [0x4620, 0x6c00, 0x4620, 0x6c00],
    [0x2640, 0xc600, 0x2640, 0xc600],
    [0x6220, 0x1700, 0x2230, 0x0740],
    [0x6440, 0x0e20, 0x44c0, 0x8e00],
    [0x0660, 0x0660, 0x0660, 0x0660]
  ];
  var pointsTypes = new Array();
  types.forEach(function (v) {
    var pointsType = new Array();
    v.forEach(function (vv) {
      var points = new Array();
      for (var j = 0; j < 4; j++) {
        for (var k = 0; k < 4; k++) {
          if ((vv >> (j * 4 + k)) & 1) {
            points.push({ x: j, y: k });
          }
        }
      }
      pointsType.push(points);
    });
    pointsTypes.push(pointsType);
  });
  Game.Blocks = pointsTypes;
  Game.prototype.fromCompress = function (data) {
    if (!data || data.length != 47) return false;
		
    //解压数据,总长度47
    this.status = parseInt(data[0], 32);
    this.board = [];
    for (var i = 0; i < 20; i++) {
      this.board[i] = [];
      for (var j = 0; j < 10; j++) {
        this.board[i][j] = 0;
      }
    }
    i = 0;
    j = 0;
    var k = 0;
    for (var si = 0; si < 40; si++) {
      var temp = parseInt(data[si + 1], 32);
      for (var sc = 0; sc < 5; sc++) {
        this.board[i][j++] = (temp >> sc) & 1;
      }
      k++;
      if (k == 2) {
        k = 0; j = 0; i++;
      }
    }

    this.x = parseInt(data[41], 32);
    if (this.x > 9) this.x -= 16;
    this.y = parseInt(data[42], 32);
    this.block = { k: parseInt(data[43], 32), i: parseInt(data[44], 32) }
    this.preBlock = { k: parseInt(data[45], 32), i: parseInt(data[46], 32) }
    return true;
  };
  return Game;

})();
var Shadow = (function () {
  function Client(id) {
    this.id = id;
    this.tbl = document.getElementById("board" + this.id);
    this.preTbl = document.getElementById("preBoard" + this.id);
    this.game = new Game();
  }


  Client.prototype.update = function () {

    this.eraseBoard();
    this.paintBoard();
    this.erasePreview();
    this.paintPreview();
    this.paint();

  };

  Client.prototype.fromCompress = function (data) {
    return this.game.fromCompress(data);

  }
  //绘活动图形   
  Client.prototype.paint = function () {
    var points = Game.Blocks[this.game.block.k][this.game.block.i];
    for (var i = 0; i < points.length; i++) {
      this.tbl.rows[points[i].y + this.game.y].cells[points[i].x + this.game.x].style.backgroundColor = "red";
    }
  };
      
  //绘预览图形  
  Client.prototype.paintPreview = function () {
    var points = Game.Blocks[this.game.preBlock.k][this.game.preBlock.i];
    for (var i = 0; i < 4; i++) {
      this.preTbl.rows[points[i].y].cells[points[i].x].style.backgroundColor = "red";
    }
  };
  //擦除预览图形  
  Client.prototype.erasePreview = function () {
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 4; j++) {
        this.preTbl.rows[j].cells[i].style.backgroundColor = "white";
      }
    }
  };
  //擦除整个面板   
  Client.prototype.eraseBoard = function () {
    for (var i = 0; i < 20; i++) {
      for (var j = 0; j < 10; j++) {
        this.tbl.rows[i].cells[j].style.backgroundColor = "white";
      }
    }
  };
  //重绘整个面板   
  Client.prototype.paintBoard = function () {
    for (var i = 0; i < 20; i++) {
      for (var j = 0; j < 10; j++) {
        if (this.game.board[i][j] == 1) {
          this.tbl.rows[i].cells[j].style.backgroundColor = "red";
        }
      }
    }
  };

  return Client;
})();

var Player = (function () {
  function Player(id) {
    this.id = id;
    this.handlers = {};
    this.speed = 1;
    this.shadow = new Shadow(id);
  }
  Player.prototype.load = function (data) {
    this.data = data.split(';');
    this.length = this.data.length - 1;
    for (var i = 0; i < this.length; i++) {
      this.data[i] = this.data[i].split(',');
    }
    if (!this.length) return false;
    this.i = 0;
    return true;
  }
  Player.prototype.s = function () {
    this.speed = 1;
  }
  Player.prototype.s2 = function () {
    this.speed = 2;
  }
  Player.prototype.s4 = function () {
    this.speed = 4;
  }
  Player.prototype.s8 = function () {
    this.speed = 8;
  }
  Player.prototype.play = function () {
    if (this.length) {
      if (this.i < this.length) {
        var _this = this;
        var timeout = parseInt(this.data[this.i][0]) / this.speed;
        setTimeout(function () {
          if (_this.data[_this.i]) {
            _this.shadow.fromCompress(_this.data[_this.i][2]);
            _this.shadow.update();
            _this.emit('score', _this.data[_this.i][1]);
            _this.i++;
            _this.play();
          }
        }, timeout);
      } else {
        this.emit('end');
      }
    }
  };
  //绑定事件
  Player.prototype.on = function (event, handler) {
    if (typeof this.handlers[event] == "undefined") {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  };
  //触发事件
  Player.prototype.emit = function (event, params) {
    if (this.handlers[event] instanceof Array) {
      var handlers = this.handlers[event];
      for (var i = 0; i < handlers.length; i++) {
        handlers[i](params);
      }
    }
  };
  return Player;
})();