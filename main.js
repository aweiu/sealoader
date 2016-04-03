var request = require('request');
var fs=require("fs");
var path=require("path");
var config=require("./sealoaderConfig");
var exec = require('child_process').exec;
require('colors');
var cachedList=[];
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
				if(a.deps)this.show(a.deps,++level);
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
		isOver=function () {
			if(depsList.reduce()==0){
				console.log((path.normalize(superJs)+"所有依赖模块加载完毕!其依赖关系如下:").green);
				depsList.show();
			}
		},
		main=function (jsPath,depsListLevel,callBac) {
			fs.readFile(jsPath, "utf8",function (err, data) {
			  if (err) throw err;
			  getDeps(data).forEach(function (fileName) {
			  	fileName=eval(fileName);
			  	if(fileName.indexOf("/")==-1){
			  		var level=[];
			  		depsList.pushLevel(depsListLevel,fileName,level);
				  	download(fileName,function(error,jsPath){
			  			if(error){
			  				errorTip(superJs+"的依赖加载失败!原因是:"+error);
			  			}else{
			  				main(jsPath,level,isOver);
			  			}
				  	},false);
				  	var otherDeps=config.otherDeps[fileName];
				  	if(otherDeps){
				  		if(typeof otherDeps=="string")otherDeps=[otherDeps];
				  		otherDeps.forEach(function(m){
				  			depsList.pushLevel(level,m,null);
				  			download(m,function (error) {
				  				if(error){
				  					errorTip(superJs+"的依赖加载失败!原因是:"+error);
				  				}else{
				  					isOver(superJs);
				  				}
				  			},false);
				  		});
				  	}  		
				}
			  })
			  if(callBac)callBac();
			});
		}
	console.log(("开始获取"+path.normalize(superJs)+"的依赖...").yellow);
	main(superJs);
};
exports.do=function(jsPath,cache){
	if(jsPath.indexOf(".js")!=-1){
		downloadDeps(jsPath);
	}else{
		fs.readdir(jsPath,function (err,files) {
		 	if (err) throw err;
		 	if(files.length>0){
		 		files.forEach(function (m) {
			 		downloadDeps(jsPath+"/"+m);
			 	})
		 	}else{
		 		console.log(("未在"+path.normalize(jsPath)+"目录下发现任何js文件,请检查").red);
		 	} 	
		})
	}
}
function getSpace(num) {
	var spaces="";
	for(var i=0,num=num*4;i<num;i++){
		spaces+="-";
	}
	return spaces;
}
function download(url,callBac,cache){
	var urlA=url.split(".");
	if(urlA.length>1){
		var extension=urlA[urlA.length-1];
	}else{
		extension="js";
		url=url+".js";
	}
	var fileName=url,
		path=extension;
	//获取path(url>extensionToPath>extension)
	var index=url.lastIndexOf("/")+1;
	if(index!=0){
		path=url.substr(0,index);
		fileName=url.substring(index,url.length);
	}else{
		for(var o in config.extensionToPath){
			var extensions=config.extensionToPath[o];
			if(typeof extensions=="string")extensions=[extensions];
			if(extensions.indexOf(extension)!=-1){
				path=o;
				break;
			}
		}
	}
	var output='./libs/'+path+'/'+fileName;
	url=config.onlinePath+"/libs/"+path+"/"+fileName;
	if((cache!==false || cachedList.indexOf(url)!=-1) && fs.existsSync(output)){
		if(callBac){
			setTimeout(function () {
				 callBac(false,output);
			}, 0);
		}
		return;
	}
	mkdirsSync("libs/"+path);
	var req=request(url,function(error,response,body){
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
		  	rValue.push.apply(rValue,ss.match(/["'].*?[",']/g));
		}
	})
	return rValue;
};
function errorTip (tip) {
	console.log(tip.red);
}
function mkdirsSync(dirpath, mode) { 
    if (!fs.existsSync(dirpath)) {
        var pathtmp;
        dirpath.split("/").forEach(function(dirname) {
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
