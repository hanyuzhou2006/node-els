var Readable = require('stream').Readable;
var Record = (function () {
	var ALY = require('aliyun-sdk');
	var oss = new ALY.OSS({
		"accessKeyId": "你的accessKeyId",
		"secretAccessKey": "你的secretAccessKey",
		// 根据你的 oss 实例所在地区选择填入
		// 杭州：http://oss-cn-hangzhou.aliyuncs.com
		// 北京：http://oss-cn-beijing.aliyuncs.com
		// 青岛：http://oss-cn-qingdao.aliyuncs.com
		// 深圳：http://oss-cn-shenzhen.aliyuncs.com
		// 香港：http://oss-cn-hongkong.aliyuncs.com
		// 注意：如果你是在 ECS 上连接 OSS，可以使用内网地址，速度快，没有带宽限制。
		// 杭州：http://oss-cn-hangzhou-internal.aliyuncs.com
		// 北京：http://oss-cn-beijing-internal.aliyuncs.com
		// 青岛：http://oss-cn-qingdao-internal.aliyuncs.com
		// 深圳：http://oss-cn-shenzhen-internal.aliyuncs.com
		// 香港：http://oss-cn-hongkong-internal.aliyuncs.com
		endpoint: 'http://oss-cn-hangzhou-internal.aliyuncs.com',
		// 这是 oss sdk 目前支持最新的 api 版本, 不需要修改
		apiVersion: '2013-10-15'
	});
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
				oss.putObject({
					Bucket: _this.bucket,
					Key: _this.key,                 // 注意, Key 的值不能以 / 开头, 否则会返回错误.
					Body: writeData,
					AccessControlAllowOrigin: '',
					ContentType: 'text/plain',
					CacheControl: 'no-cache',         // 参考: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.9
					ContentDisposition: '',           // 参考: http://www.w3.org/Protocols/rfc2616/rfc2616-sec19.html#sec19.5.1
					ContentEncoding: 'utf-8',         // 参考: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.11
					ServerSideEncryption: 'AES256',
					Expires: null                     // 参考: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.21
				},
					function (err, data) {
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
		this.oss = oss;
		this.src = 'oss-current';
		this.dst = 'oss-record';
		this.fileHost = 'http://oss-record.oss-cn-hangzhou.aliyuncs.com';
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
		this.oss.getObject({
			Bucket: this.dst,
			Key: name
		},
			function (err, data) {
				if (err) {
					callback(err)
				} else {
					callback(null, data.Body);
				}
			});
	}

	Record.prototype.copyTo = function (name) {
		//console.log(new Date().format(),': ',name,'start copy '); 
		this.oss.copyObject({
			Bucket: this.dst,
			CopySource: '/' + this.src + '/' + name,
			Key: name,
			MetadataDirective: 'REPLACE',     // 'REPLACE' 表示覆盖 meta 信息，'COPY' 表示不覆盖，只拷贝
			ContentType: 'text/plain',
			CacheControl: 'no-cache',         // 参考: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.9
			ContentDisposition: '',           // 参考: http://www.w3.org/Protocols/rfc2616/rfc2616-sec19.html#sec19.5.1
			ContentEncoding: 'utf-8',         // 参考: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.11
			ServerSideEncryption: 'AES256',
			Expires: null                       // 参考: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.21
		},
			function (err, data) {
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