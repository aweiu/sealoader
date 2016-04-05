var request = require('request');
var fs=require("fs");
var path=require("path");
require('colors');
var cachedList=[],
	isCache,
	config,
	showDeps,
	pro={
		len:0,
		val:0,
		getNow:function(){
			return "(总进度:"+(++this.val)+"/"+this.len+")"
		}
	};
exports.do=function(jsPath,conf,cache,isShowDeps){
	config=conf;
	isCache=cache;
	jsPath=path.normalize(jsPath);
	showDeps=isShowDeps;
	var seaOutPut=getToPath("sea").outPut;
	if(!fs.existsSync(seaOutPut)){
		pro.len=1;
		console.log("开始下载基础模块sea.js".yellow);
		download("sea",function(error){
			if(error){
				errorFuc.main("sea.js","获取基础模块sea.js失败!原因是:",true);
			}else{
				console.log(("基础模块sea.js下载成功"+pro.getNow()).green);
			}
		})
	}
	if(jsPath.indexOf(".js")!=-1){
		pro.len++;
		downloadDeps(jsPath);
	}else{
		fs.readdir(jsPath,function (err,files) {
			if (err) throw err;
			if(files.length>0){
				pro.len+=files.length;
				files.forEach(function (m) {
					downloadDeps(path.join(jsPath,m));
				})
			}else{
				console.log(("未在"+jsPath+"目录下发现任何js文件,请检查").red);
			}
		})
	}
}
var	downloadDeps=function(superJs) {
		var	depsList=new function(){
				var list=[],length=0;
				this.plus=function () {
					return ++length;
				}
				this.reduce=function () {
					return --length;
				}
				this.show=function(array,level){
					array=array||list;
					level=level||0;
					for(var i=0,l=array.length;i<l;i++){
						var a=array[i];
						console.log(getSpace(level)+a.name);
						if(a.deps)this.show(a.deps,level+1);
					}
				}
				this.pushLevel=function (depsArray,name,deps) {
					depsArray=depsArray||list;
					depsArray.push({
						name:name,
						deps:deps
					});
					length++;
				}
			}(),
			afterDownLoad=function (error) {
				var isOver=depsList.reduce()==0;
				if(error)errorFuc.main(superJs,error,isOver);
				if(isOver){
					if(!errorFuc.hasError(superJs)){
						console.log((superJs+"所有依赖模块加载完毕!"+pro.getNow()).green);
						if(showDeps){
							console.log("其依赖关系如下:");
							depsList.show();
						}
					}
					if(pro.val>=pro.len)errorFuc.show();
				}
			},
			main=function (jsPath,depsListLevel,callBac) {
				fs.readFile(jsPath, "utf8",function (err, data) {
					if (err) throw err;
					var tmp=true;
					getDeps(data).forEach(function (fileName) {
						fileName=eval(fileName);
						if(fileName.indexOf("/")==-1){
							tmp=false;
							var level=[];
							depsList.pushLevel(depsListLevel,fileName,level);
							download(fileName,function(error,jsPath){
								if(error){
									afterDownLoad(error);
								}else{
									main(jsPath,level,afterDownLoad);
								}
							});
							var otherDeps=config.otherDeps[fileName];
							if(otherDeps){
								if(typeof otherDeps=="string")otherDeps=[otherDeps];
								otherDeps.forEach(function(m){
									depsList.pushLevel(level,m,null);
									download(m,afterDownLoad);
								});
							}
						}
					})
					if(tmp&&!callBac)console.log((superJs+"所有依赖模块加载完毕!其不依赖任何线上模块"+pro.getNow()).green);
					if(callBac)callBac();
				});
			}
		console.log(("开始获取"+superJs+"的依赖...").yellow);
		main(superJs);
	},
	errorFuc=new function(){
		var errorObj={},hasError=false;
		this.main=function(superJs,error,isShowPro){
			hasError=true;
			if(!errorObj[superJs])errorObj[superJs]=[];
			errorObj[superJs].push(error);
			console.log((superJs+"的依赖加载失败!原因是:"+error+(isShowPro?pro.getNow():"")).red);
		}
		this.show=function(){
			if(hasError){
				console.log("错误日志:");
				console.log(JSON.stringify(errorObj,null,4).red);
			};
		}
		this.hasError=function(superJs){
			return errorObj.hasOwnProperty(superJs);
		}
	}();
function getSpace(num) {
	var spaces="";
	for(var i=0,num=num*4;i<num;i++){
		spaces+="-";
	}
	return spaces;
}
function getToPath(baseFileName){
	var extension=path.extname(baseFileName).replace(".","");
	if(extension==""){
		extension="js";
		baseFileName=baseFileName+".js";
	}
	var fileName=baseFileName,
		toPath=extension;
	//获取toPath(baseFileName>extensionToPath>extension)
	var index=baseFileName.lastIndexOf(path.sep)+1;
	if(index!=0){
		toPath=baseFileName.substr(0,index);
		fileName=baseFileName.substring(index,baseFileName.length);
	}else{
		for(var o in config.extensionToPath){
			var extensions=config.extensionToPath[o];
			if(typeof extensions=="string")extensions=[extensions];
			if(extensions.indexOf(extension)!=-1){
				toPath=o;
				break;
			}
		}
	}
	return {
		path:toPath,
		outPut:path.join("libs",toPath,fileName)
	}
}
function download(baseFileName,callBac){
	var toPath=getToPath(baseFileName);
	var output=toPath.outPut;
	var url=config.onlinePath+"/"+output;
	if((isCache!==false || cachedList.indexOf(url)!=-1) && fs.existsSync(output)){
		if(callBac){
			setTimeout(function () {
				callBac(false,output);
			}, 0);
		}
		return;
	}
	mkdirsSync(path.join("libs",toPath.path));
	request(url,function(error,response){
		if (!error) {
			if(response.statusCode==200){
				cachedList.push(url);
				if(callBac)callBac(false,output);
			}else{
				fs.unlink(output);
				if(callBac)callBac("获取"+url+"失败!请检查",output);
			}
		}else{
			fs.unlink(output);
			if(callBac)callBac("获取"+url+"远端服务器异常",output);
		}
	}).pipe(fs.createWriteStream(output));
}
function getDeps(data) {
	var rValue=[];
	["require","seajs.use","utils.use"].forEach(function (key) {
		var dw1,dw2=0;
		while (true) {
			dw1=data.indexOf(key,dw2);
			if(dw1==-1)break;
			dw2=data.indexOf(")",dw1);
			var ss=data.substring(dw1,dw2);
			rValue.push.apply(rValue,ss.match(/["'].*?["']/g));
		}
	})
	return rValue;
};
function mkdirsSync(dirpath, mode) {
	if (!fs.existsSync(dirpath)) {
		var pathtmp;
		dirpath.split(path.sep).forEach(function(dirname) {
			if (pathtmp) {
				pathtmp = path.join(pathtmp, dirname);
			}
			else {
				pathtmp = dirname;
			}
			if (!fs.existsSync(pathtmp)) {
				if (!fs.mkdirSync(pathtmp, mode)) {
					return false;
				}
			}
		});
	}
	return true;
}