# 错暑二剧情文本配置教程 <span style="font-size: 15px;">`文章分级[B]`</span>

<img src="assets\showing\9.png" width="1100px" title="错暑二"><br>

***

#### 角色立绘展示
~~~python
    show qc hzjh
~~~
* 这段代码主要用于展示角色立绘（或更改角色立绘），使用此段代码时不会出现有`动画展示`
> 角色类型代码 : 所有角色名字的首字母缩写（例如启诚就是`qc`）
~~~python
    show wq hrt b:
        xcenter 0.6 xzoom 1 yoffset 0
    show wq:
        ease 0.4 yoffset -350
~~~
* 这段代码主要用于展示角色立绘（或更改角色立绘），但不同于上方代码，使用此段代码时会有`动画展示`

***

#### 背景切换
~~~python
    scene black
~~~
* 切换（展示）特定壁纸，无任何其他添加效果。
> * 你可以通过在游戏素材文件夹内（`.\CSE-2.1.0-pc\game\images\background`）加入`.jpg`格式图片以用来展示自定义背景。
> * 如果是在后日谈（`epilogueplot.rpy`）文本中修改内容，则需要到特定的后日谈游戏素材文件夹内（`.\CSE-2.1.0-pc\game\images\hrt\hrt_background`）进行添加。
~~~python
    scene black
    show credits_text "{size=60}他的原点。{/size}"
    pause 5.0
    hide credits_text 
~~~
* 切换黑色背景，并展示白色字体内容：`他的原点`，大小(size)为`60`，暂停(pause)`5.0秒`，随后自动切换。
