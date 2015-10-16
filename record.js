var Readable = require('stream').Readable;
var fs = require("fs");
var Record = (function () {
	function Record() {
		if (!fs.existsSync('current/')) {
			fs.mkdirSync('current/');
		};
		this.count = 0;
		this.index = 0;
		//状态流
		this.strs = new Readable;
		this.strs._read = function () { };
		this.stws = fs.createWriteStream('current/status' + this.index + '.txt');
		this.strs.pipe(this.stws);  
	 
		//info
		this.hirs = new Readable;
		this.hirs._read = function () { };
		this.hiws = fs.createWriteStream('current/info.txt');
		this.hirs.pipe(this.hiws);
	}
	Record.prototype.changeIndex = function () {
		this.strs.push(null);
		this.index++;
		this.strs = new Readable;
		this.strs._read = function () { };
		this.stws = fs.createWriteStream('current/status' + this.index + '.txt');
		this.strs.pipe(this.stws);  
	}
	
	return Record;
})();
module.exports = Record;