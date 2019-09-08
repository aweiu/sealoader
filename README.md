# sealoader

插件加载器 — seajs 前端开发解决方案

## 简介

本插件适合使用 seajs 开发的团队，随着项目的积累，可能生产了很多通用模块，每次开干都得各种拷贝，但这个过程肯定不是轻松+愉快的。如果所有模块你都一次性拷贝过来的那当我没说，但强迫症患会觉得某些插件我没都用上为什么都要拷过来？它会直接导致项目中的 js 文件太多，结构混乱。而且如果插件更新了，你是不是还得去拷？这显然不科学！更蛋疼的情况：<br>

比如你要使用插件 a，但插件 a 依赖于插件 b，插件 b 又特么地依赖于插件 c。。你能记得住？而且某些插件可能是动态依赖的，直接运行不会报错，相当容易造成依赖缺失。<br>

本插件干的事情就是一键检索项目中所有使用到的通用模块，自动下载模块的依赖，模块的依赖的依赖。。<br>

[文档地址](https://aweiu.com/documents/sealoader/)
