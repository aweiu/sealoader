var request = require('request');
var fs=require("fs");
var path=require("path");
require('colors');
var	otherAg,
	config,
	pro={
		len:0,
		val:0,
		getNow:function(){
			return "(总进度:"+(++this.val)+"/"+this.len+")"
		},
		isOver:function(){
			if(this.val>=this.len){
				console.log('构建任务全部完毕!'.green);
				console.log('提示: sealoader -v 可检测sealoader最新版本'.yellow);
				errorFuc.show();
				process.exit();
			}
		}
	};
exports.do=function(jsPath,conf,oa){
	config=conf;
	otherAg=oa;
	jsPath=path.normalize(jsPath);
	var seaOutPut=getToPath("sea").outPut;
	if(!cacheFuc.isCache(null,seaOutPut)){
		downloadOnline("sea.js","开始下载基础模块sea.js","基础模块sea.js下载成功");
	}
	if(otherAg["-online"]){
		downloadOnline(jsPath,"开始下载线上资源"+jsPath,"线上资源"+jsPath+"下载成功");
	}else{
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
}
var	downloadDeps=function(superJs,isOnlineJs) {
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
					if(array==list&&isOnlineJs)array=array[0].deps;
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
				var isOver=(depsList.reduce()==0);
				if(error)errorFuc.main(superJs,error);
				if(isOver){
					console.log((superJs+(errorFuc.hasError(superJs)?"加载完毕!但发生了错误":"所有依赖模块加载完毕!")+pro.getNow()).green);
					if(otherAg["-showdeps"]){
						console.log("其依赖关系如下:");
						depsList.show();
					}
					pro.isOver();
				}
			},
			downloadAll=function(fileName,depsListLevel){
				var level=[];
				depsList.pushLevel(depsListLevel,fileName,level);
				download(fileName,function(error,jsPath){
					if(error){
						afterDownLoad(error);
					}else{
						main(jsPath,level,afterDownLoad);
					}
				});
				var otherDeps=config.otherDeps[path.basename(fileName,".js")];
				if(otherDeps){
					if(typeof otherDeps=="string")otherDeps=[otherDeps];
					otherDeps.forEach(function(m){
						depsList.pushLevel(level,m,null);
						download(m,afterDownLoad);
					});
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
							downloadAll(fileName,depsListLevel);
						}
					})
					if(tmp&&!callBac)console.log((superJs+"所有依赖模块加载完毕!其不依赖任何线上模块或未使用seajs依赖规范"+pro.getNow()).green);
					if(callBac)callBac();
				});
			}
		console.log(("开始获取"+superJs+"的依赖...").yellow);
		isOnlineJs?downloadAll(superJs):main(superJs);
	},
	errorFuc=new function(){
		var errorObj={},hasError=false;
		this.main=function(superJs,error,isOnly){
			hasError=true;
			if(!errorObj[superJs])errorObj[superJs]=[];
			errorObj[superJs].push(error);
			console.log((superJs+(isOnly?"":"的依赖")+"加载失败!原因是:"+error).red);
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
function checkFile(filePath) {
	try{
		return fs.existsSync(filePath)&&fs.statSync(filePath).size>0;
	}catch(e){
		return false;
	}
}
function getDeps(data) {
	var rValue=[];
	var otherDepKey=config.otherDepKey||[];
	if(typeof otherDepKey=="string")otherDepKey=[otherDepKey];
	otherDepKey.unshift("require","seajs.use");
	var baseIndex=data.indexOf("require")+7;
	otherDepKey.forEach(function (key) {
		var dw1,dw2=baseIndex;
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
function downloadOnline(fileName,t1,t2){
	pro.len++;
	console.log(t1.yellow);
	download(fileName,function(error,output){
		if(error){
			errorFuc.main(fileName,error,true);
		}else{
			var superJs=path.basename(output),
				ext=path.extname(superJs);
			if(superJs!="sea.js"&&ext==".js"){
				console.log(t2.green);
				downloadDeps(superJs,true);
			}else{
				console.log((t2+pro.getNow()).green);
				pro.isOver();
			}
		}
	})
}
var cacheFuc=new function () {
	var cachedList=[],
		requestList={};
	this.add=function (url) {
		cachedList.push(url);
	}
	this.isCache=function (url,output) {
		url=url||config.onlinePath+"/"+output.replace(/\\/g,"/");
		return (otherAg["-nocache"]!==false || cachedList.indexOf(url)!=-1) && checkFile(output);
	}
	this.addCallBac=function (url,callBac) {
		var rValue=requestList.hasOwnProperty(url);
		if(!rValue)requestList[url]=[];
		if(callBac)requestList[url].push(callBac);
		return rValue;
	}
	this.doCallBac=function (url,error,output) {
		requestList[url].forEach(function(m){
			m(error,output);
		})
		delete requestList[url];
	}
}();
function download(baseFileName,callBac){
	var toPath=getToPath(baseFileName);
	var output=toPath.outPut;
	var url=config.onlinePath+"/"+output.replace(/\\/g,"/");
	if(cacheFuc.isCache(url,output)){
		if(callBac){
			setTimeout(function () {
				callBac(false,output);
			}, 0);
		}
		return;
	}
	if(cacheFuc.addCallBac(url,callBac))return;
	mkdirsSync(path.join("libs",toPath.path));
	myRequest(url,callBac,output);
}
function myRequest(url,callBac,output){
	var timeOut=true,retry= 0;
	var main=function(){
		request(url,function(error,response){
			if(!timeOut)return;
			timeOut=false;
			if (!error) {
				if(response.statusCode==200){
					cacheFuc.doCallBac(url,false,output);
				}else{
					fs.unlink(output);
					cacheFuc.doCallBac(url,"获取"+url+"失败!请检查",output);
				}
			}else{
				fs.unlink(output);
				cacheFuc.doCallBac(url,"获取"+url+"远端服务器异常",output);
			}
		}).pipe(fs.createWriteStream(output));
		checkTimeout();
	};
	var checkTimeout=function(){
		setTimeout(function(){
			if(timeOut){
				if((retry++)>=3){
					if(callBac)callBac("获取"+url+"超时且超过最大重试次数!请检查",output);
				}else{
					main();
				}
			}
		},5000);
	};
	main();
}