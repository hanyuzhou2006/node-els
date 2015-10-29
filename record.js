var fs = require('fs');
var Record = (function () {

	var MyStream = (function () {
		function MyStream(bucket, jsonpCallback) {
			this.data = '';
      this.bucket = bucket;
			this.jsonpCallback = jsonpCallback;
		}
		MyStream.prototype.setKey = function (key) {
			this.key = key;
		}
		MyStream.prototype.push = function (data, callback) {
			var _this = this;
			if (!_this.key) return;
			if (data != null) {
				_this.data += data;
			} else {
				var writeData = new Buffer(this.jsonpCallback + '("' + _this.data + '")', 'utf-8');
				//console.log(new Date().format(),': ',_this.key,' write start')
				fs.writeFile(_this.bucket + '/' + _this.key, writeData, function (err) {
					if (err) {
						console.log(new Date().format(), ': ', _this.key, 'write failed,error:', err);
						return;
					}
					//	console.log(new Date().format(),': ',_this.key,' write success');
					_this.data = '';

					if (typeof callback === 'function') {

						callback();
					}
				});
			}

		}

		return MyStream;
	})();
	function Record() {
		this.src = 'oss-current';
		this.dst = 'oss-record';
		this.fileHost = '/els-record';
		this.ok = 0;
		this.count = 0;
		this.index = 0;
		this.end = 0;
		this.callback = null;
		//状态
		this.strs = new MyStream(this.src, 'callback');
		this.strs.setKey('status' + this.index + '.txt');
		//info
		this.hirs = new MyStream(this.dst, 'callback');
		this.hirs.setKey('info.txt');
   
	}
	 
	Record.prototype.init = function () {
		this.count = 0;
		this.index = 0;
		this.end = 0;
		this.ok = 0;
		this.callback = null;
	}
	Record.prototype.setCopy = function () {
		var _this = this;
		this.callback = function () {

			if (_this.ok == _this.index && this.end == 1) {
				_this.apply();
			}
		};
	}
	Record.prototype.changeIndex = function () {
		var _this = this;

		this.strs.push(null, function () {
			_this.ok++;

			if (typeof _this.callback === 'function') {
				_this.callback();
			}
		});
		this.index++;
		this.strs.setKey('status' + this.index + '.txt');
	}
	Record.prototype.getFile = function (name, callback) {
		fs.readFile(this.dst + '/' + name, function (err, data) {
			if (err) {
				callback(err)
			} else {
				callback(null, data);
			}
		})

	}

	Record.prototype.copyTo = function (name) {
		//console.log(new Date().format(), ': ', name, 'start copy ');
		fs.rename(this.src + '/' + name, this.dst + '/' + name, function (err) {
			if (err) {
				console.log(new Date().format(), ':', name, ' copy failed,error:', err.code);
				return;
			}
			//console.log(new Date().format(),': ',name,' copy  success');
		});

	}
  Record.prototype.apply = function () {
		for (var i = 0; i <= this.index; i++) {
			var name = 'status' + i + '.txt';
			this.copyTo(name);
		}

	}
	return Record;
})();
module.exports = Record;