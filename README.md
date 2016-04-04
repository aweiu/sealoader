# sealoader 插件加载器—seajs前端开发解决方案
##介绍: 
　主要是受够了市面上的各种包管理工具,干个屁大点事儿就得写一堆配置！还有，我也不知道国内现在做技术的是什么风气，就喜欢把API文档写得云里雾里的，能愣是把一段中文说得像是从英文翻译过来的。聊点框架，设计模式的能说得跟玄学似的，感觉不会再爱了。。<br>
  其中有个最让我印象深刻的博客，说xxx框架底层使用当前性能最高的Vanilla编写，哥当时就不淡定了，Vanilla?卧槽，这是个啥玩意？瞬间感觉自己文化水平太低，于是百度了半天。。Vanilla这货翻译过来就是原生js！CNM！<br>
  最后再吐槽一下seajs官方推荐的包管理工具，spm，现在好像下架了，叫什么蚂蚁脚手架(哥翻译的)。作为seajs的亲爹，每个模块的依赖竟然还得手动地去配置文件里一个个地写,给自动分析下依赖会死吗？其它包管理工具就算了，你作为亲爸爸，你生成的那种目录结构，有没有考虑过洁癖症的感受?<br>
  ok,吐槽完毕！(一般,要发布个新东西之前首先要做的就是先喷一下老的，这是礼节！)<br>
  本插件适合使用seajs开发的团队，随着项目的积累，可能生产了很多通用模块，每次开干都得各种拷贝，但这个过程肯定不是轻松+愉快的。如果所有模块你都一次性拷贝过来的那当我没说，但强迫症患会觉得某些插件我没都用上为什么都要拷过来？它会直接导致项目中的js文件太多，结构混乱。而且如果插件更新了，你是不是还得去拷？这显然不科学！更蛋疼的情况：<br>
　比如你要使用插件a，但插件a依赖于插件b，插件b又特么地依赖于插件c。。你能记得住？而且某些插件可能是动态依赖的，直接运行不会报错，相当容易造成依赖缺失。<br>
　本插件干的事情就是一键检索项目中所有使用到的通用模块，自动下载模块的依赖，模块的依赖的依赖。。<br>
　好了，不废话了，进入正题:
##一.搭建静态资源仓库

1. 创建一个静态仓库(局域网/远端)
2. 创建根目录"libs",并将所有插件移到里面，当然不要忘了基础模块:<font color=red>sea.js</font>
        /libs
            /js *存放js插件,sea.js也在里面哦
            /css *存放插件依赖的css
            /imgs *存放插件依赖的图片
3. 修改仓库内**所有插件**的依赖地址，全部改成相对地址(先辛苦下，一劳永逸的事情嘛)。<br>如:libs/js目录下有个插件<font color=red>a.js:</font>
```js
define(function (require, exports, module) {
    //这行代码主要的作用是通过sea.js的路径获取到当前项目的lib地址,以便于引用其它静态资源
    var assetsUrl=module.uri;
    assetsUrl=assetsUrl.substring(0,assetsUrl.lastIndexOf("/js/"))+"/";
    //模块a依赖模块b,require参数直接"b"就好了，不用写路径
    //因为sea.js和a.js,b.js都在同一个目录(/js)下面
    var b=require("b");
    //use依赖同理。。
    seajs.use("seajs-css",function(){
        //模块a依赖libs/css/a.css
        seajs.use(assetsUrl+"css/a.css");
    });
    //模块a还依赖libs/img/a.png 
    var img=document.createElement("img");
    img.src=assetsUrl+"img/a.png";
    //总之,依赖js模块直接写js文件名，依赖其它静态资源就是assetsUrl+文件名
})
```
###小贴士:
        其实如果您完成了静态资源仓库的搭建,并且仓库是在远端(比如oss/cdn)，其实您已经可以轻松愉快地去使用线上插件了
        您只需要将页面中引用sea.js的路径全部改成线上路径即可。但缺点是你得保证该静态资源仓库长期可用，并且需求方能
        够接受页面中存在其它站点的流量

##二.相关路径配置
假设当前您的项目目录为:

    */webapp
        /js *业务相关js代码
        /img
        .... 
1. 修改页面中sea.js的引用路径
```html
<!DOCTYPE html>
<html lang="en">
    <body>
        <script src="/libs/js/sea.js" id="seajsnode"></script>
    </body>
</html>    
```
2. 修改webapp/js 中的代码依赖路径，如,webapp/js/index.js:
```js
define(function (require, exports, module) {
    //依赖通用模块"seajs-utils.js"
    var utils=require("seajs-utils");
    //依赖业务模块"banner.js"
    var banner=require("/js/banner");
})
```
###小贴士:
        其实这一步对于熟悉seajs依赖路径的童鞋来说都是废话，大家可以完全根据自己的喜好来。

##三.安装+配置sealoader
1. 执行如下shell命令安装sealoader,***全局安装!***
```shell
npm install sealoader -g
```
2. 打开配置文件:sealoaderConfig.js
```shell
sealoader -config
```
配置参考如下:
```
{
    //需要加载依赖的js目录/js文件 运行sealoader指令将会对此目录下的所有js文件进行依赖模块下载(相对命令行的启动目录) 默认:"./js" 
    "jsPath":"",
    //线上模块仓库地址 比如模块a的地址是:http://xxx.xxx.com/libs/js/a.js 那onlinePath须为"http://xxx.xxx.com"
    "onlinePath":"",
    //后缀路径映射
    //如果不写则默认目录和后缀名一致 就像a.js如果在/libs/js,目录下,那么js文件就无须配置后缀路径映射
    //比如:要加载通用模块a.js,但sealoader只知道模块都在/libs文件夹里，但不知道a.js在libs的具体哪个文件夹里
        // 如果extensionToPath没有对js的文件后缀进行配置，那sealoader就会默认a.js是在/libs/js文件夹里
        // 如果extensionToPath中有js:'myJs',那sealoader就会去/libs/myJs中去加载a.js
    "extensionToPath":{
        // 示例:
        // "flash":"swf",
        // "imgs":["gif","png"]
    },
    //其它非js依赖配置
    //js模块依赖sealoader可以通过源码解析得出,但一些其他的资源文件,比如图片,css还是需要去手工配置一下的
    "otherDeps":{
        //示例:
        //"a":"a.png",
        //"b":["b.css","b.png"],
        //"c":["js/c.png"] 这么写则代表sealoader加载c.png会从/libs/js/中去取
    },
    //如果你们有一个插件目录页面的话 可以将页面地址写在这儿 执行"-menu"命令即会访问
    //默认:http://awei.oss-cn-shenzhen.aliyuncs.com/libs.html
    "libsMenuUrl":""
}
```

##四.API参数
1. Null:无参数则表示获取sealoaderConfig.jsPath中所有js的依赖
```shell
sealoader
```
2. jsPath:获取指定目录下的所有js依赖/获取指定js的依赖(相对命令行的启动目录),如:
```shell
sealoader ./js
```
```shell
sealoader ./js/index.js
```
```shell
//单个js文件可不写全路径,会从sealoaderConfig.jsPath中读取
sealoader index.js
```
3. -nocache:默认会优先从缓存中加载模块，此参数可强制获取最新模块
```shell
sealoader -nocache
```
```shell
sealoader index.js -nocache
```
4. -config:打开配置文件:sealoaderConfig.js
```shell
sealoader -config
```
5. -menu:访问插件目录页
```shell
sealoader -menu
```
6. -h:获取sealoader帮助
```shell
sealoader -h
```
7. -v:获取sealoader版本号
```shell
sealoader -v
```

##五.附录
贡献一份基于本人的线上前端插件仓库配置(sealoaderConfig.js)
```
(function(){
   return {
      "jsPath":"./js",
      "onlinePath":"http://assets.jinkaimen.com",
      "extensionToPath":{
        "flash":"swf",
        "imgs":["gif","png"]
      },
      "otherDeps":{
        "seajs-waiting":"seajs-waiting-loading.gif",
        "seajs-validate":[
          "seajs-validate.css",
          "seajs-validate-pop.png",
          "seajs-validate-pop-square.png"
        ],
        "seajs-autoPage":"seajs-autoPage-loading.gif",
        "seajs-modal-common":"PIE.htc",
        "seajs-common-tip":[
          "seajs-common-tip-success.png",
          "seajs-common-tip-fail.png"
        ],
        "seajs-passwordWidget":[
          "seajs-passwordWidget-del.png",
          "seajs-passwordWidget.css",
          "seajs-passwordWidget.html"
        ],
        "seajs-upload":"seajs-upload-loading.gif",
        "seajs-topTip":"seajs-topTip.css",
        "seajs-gritter":"jquery.gritter.css",
        "seajs-calendar":"calendar.css",
        "seajs-utils":"ZeroClipboard.swf"
      }
    }
})()
```
插件目录页：(各插件的API文档待完善中...)<br>
http://awei.oss-cn-shenzhen.aliyuncs.com/libs.html
