
var Game = (function () {
	function Game() {
		this.handlers = {};
		this.score = 0;
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
	Game.scores = [
		10,30,60,100,150,210,280,360,450,550,660,780,910,1050,1200
	]
	//游戏开始
	Game.prototype.start = function () {
		this.status = 1;
		this.board = [];
		for (var i = 0; i < 20; i++) {
			this.board[i] = [];
			for (var j = 0; j < 10; j++) {
				this.board[i][j] = 0;
			}
		}
		this.x = 4;
		this.y = 0;
		this.block = this.newBlock();
		this.preBlock = this.newBlock();
		this.speed = 1;
		this.level = 0;
		this.emit('start');
		this.emit('update');
	};
	Game.prototype.levelUp = function(){
		this.level++;
		this.speed += 1;
	}

	//生成新block
	Game.prototype.newBlock = function () {
		//随机种类
		var kind = (Math.floor(Math.random() * 20) + 1) % 7;
		var index = (Math.floor(Math.random() * 20) + 1) % 4;
		return { k: kind, i: index };
	};
	//判定某位置是否可用
	Game.prototype.isCellValid = function (x, y) {
		return (x < 10 && x >= 0 && y < 20 && y >= 0 && !this.board[y][x]);
	}
	//检测是否碰撞
	Game.prototype.checkBorder = function (block, x, y) {
		var points = Game.Blocks[block.k][block.i];
		for (var i = 0; i < points.length; i++) {
			if (!this.isCellValid(points[i].x + x, points[i].y + y)) {
				return true;
			}
		}
		return false;
	};
	//更新board
	Game.prototype.updateBoard = function () {
		var points = Game.Blocks[this.block.k][this.block.i];
		for (var i = 0; i < points.length; i++) {
			this.board[points[i].y + this.y][points[i].x + this.x] = 1;
		}

	};
	//消行
	Game.prototype.clearRows = function (rows) {
		if (rows && rows.length) {
			var tt = [];
			for (var i = 0; i < 20; i++) {
				tt[i] = 1;
			}
			for (var i = 0; i < rows.length; i++) {
				tt[rows[i]] = 0;
			}
			var board = [];
			for (var i = 0; i < rows.length; i++) {
				board[i] = [];
				for (var j = 0; j < 10; j++) {
					board[i][j] = 0;
				}
			}
			for (var i = 0; i < 20; i++) {
				if (tt[i]) {
					board.push(this.board[i]);
				}
			}
			this.board = board;
		}
	};
	//满行序列
	Game.prototype.checkRows = function () {
		var rows = [];
		for (var i = 0; i < 4; i++) {
			var y = this.y + i;
			if (y >= 20) break;
			else {
				if (this.isRowed(y)) {
					rows.push(y);
				}
			}

		}
		return rows;
	};
	//检测满行
	Game.prototype.isRowed = function (y) {

		for (var i = 0; i < 10; i++) {
			if (!this.board[y][i]) {
				return false;
			}
		}
		return true;
	};
	//向左
	Game.prototype.left = function () {
		var block = this.block;
		var x = this.x - 1;
		var y = this.y;
		if (!this.checkBorder(block, x, y)) {
			this.emit('move');
			this.x = x;
			this.y = y;
			this.emit('moved',0);
			  
		}
	};
		//旋转
	Game.prototype.rotate = function () {
		var block = { k: this.block.k, i: (this.block.i + 1) & 3 };
		var x = this.x;
		var y = this.y;

		if (!this.checkBorder(block, x, y)) {
			this.emit('move');
			this.block = block;
			this.emit('moved',1);
			 
		}
	}
	//向右
	Game.prototype.right = function () {
		var block = this.block;
		var x = this.x + 1;
		var y = this.y;
		if (!this.checkBorder(block, x, y)) {
			this.emit('move');
			this.x = x;
			this.y = y;
			this.emit('moved',2)
	    
		}
	};
	//向下 
	Game.prototype.down = function () {
		var block = this.block;
		var x = this.x;
		var y = this.y + 1;
		if (!this.checkBorder(block, x, y)) {
			this.emit('move');
			this.x = x;
			this.y = y;
			this.emit('moved',3);
       
		} else {
			this.updateBoard();
			var rows = this.checkRows();
			if (rows && rows.length) {
				this.clearRows(rows);
				this.emit('score',rows.length);
			}
			this.block = this.preBlock;
			this.preBlock = this.newBlock();
	    this.x = 4;
			this.y = 0;
      this.emit('update');
			 
			if (this.checkBorder(this.block, this.x, this.y)) {
				this.emit('end');
				this.status = 0;
			}  
		}
	};
	//自动
	Game.prototype.auto = function () {
		var _this = this;
		setTimeout(function () {
			if (_this.status) {
				_this.emit('auto');
				_this.op(3);
				_this.auto();
			}
		}, 1000 / this.speed);
	};

	//绑定事件
	Game.prototype.on = function (event, handler) {
		if (typeof this.handlers[event] == "undefined") {
			this.handlers[event] = [];
		}
		this.handlers[event].push(handler);
	};
	//触发事件
	Game.prototype.emit = function (event,params) {
		if (this.handlers[event] instanceof Array) {
			var handlers = this.handlers[event];
			for (var i = 0; i < handlers.length; i++) {
				handlers[i](params);
			}
		}
	};
	Game.prototype.op = function (code) {
		 
     
		if (this.status == 0) return;
		switch (code) {
			case 0: this.left(); break;
			case 1: this.rotate(); break;
			case 2: this.right(); break;
			case 3: this.down(); break;
		}
		  
	};
	Game.prototype.toJson = function(){
		return {status:this.status,board:this.board,x:this.x,y:this.y,
			block:this.block,preBlock:this.preBlock};
	};
	Game.prototype.toCompress = function(){
		if(typeof this.status === 'undefined'){
			console.log('undefined');
			return '';
			
		} 
		//压缩数据
		//status,board,x,y,block,preBlock,speed,score
		//数据采用32进制保存
		var result = '';
		//status,长度1
		result += this.status.toString(32);
		 
		//board ,总长度为40
		var count = 0;
		var temp = 0;
		for (var i = 0; i < 20; i++) {
			for (var j = 0; j < 10; j++) {
				  temp |= this.board[i][j]<<(count++);
				  if(count==5){
						result += temp.toString(32);
						temp = 0;
						count = 0;
					}
			}
		}
		 
		//x,y ，长度各为1
		var x =this.x<0?this.x+16:this.x;
		 
		result += x.toString(32);
		result += this.y.toString(32)
		//block,preBlock,长度各为2
		result += this.block.k.toString(32);
		result += this.block.i.toString(32);
		result += this.preBlock.k.toString(32);
		result += this.preBlock.i.toString(32);
		 
		return result;
	};
	return Game;

})();

module.exports = Game;