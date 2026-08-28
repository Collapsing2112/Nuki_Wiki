# 说在前面的话 <span style="font-size: 15px;">`文章分级[?]`</span>

<img src="assets\showing\3.png" width="1100px" title="版本更新"><br>

***

#### 什么是Nuki？
- Nuki是由MaiMai BOT框架延伸拓展出的拟人AI BOT，其目的皆在于创造出一个真正像“人”的AI模型

#### 何以延伸扩展？
- 原MaiMai BOT在目前看来仍有一些局限性，得益于大量贡献者，MaiMai BOT也在逐渐趋近于稳定及拓展新功能
- 笔者编写本Wiki的目的更重要的是讲解MaiMai的框架，能从内部逻辑拓展MaiMai本身的内容丰富性，您也可以前往MaiMai官网查阅
> https://docs.mai-mai.org/

#### Nuki的原理是什么？
- Nuki使用了MaiMai的框架进行了魔改，以下内容取自MaiMai的官网：
> \
> 多种模型协作，仿生的思考规划架构，模块化设计和内部扩展性带来拟人化的交互体验
> - 基于多个LLM配合协作，带来自然语言理解与生成能力
> - 能记住交流中发生的事，也能记住人类是怎么说话的
> - 参考认知科学理论的模块化设计，并可以进行拓展
> - 支持多种API服务，个性化设置轻松实现
>
> 更重要的是，MaiMai(Nuki)支持以下的很多功能：
> - 能够在群聊中把握合适的发言时机，模仿人类的发言规律
> - 定义不同的人格，性格，身份和说话风格
> - 学习特定群的说话风格，学习群聊中的言语方式和流行的梗
> - 使用图来存储记忆，并定期从聊天内容中生成记忆
> - 根据当前聊天内容的关键词进行记忆提取，并且会定时进行遗忘和记忆整合
> - LPMM作为知识库系统，可以进行知识的学习，并在合适的场景下调用并理解
> - 在QQ群聊中自由的偷取和使用表情包，对表情包进行理解
>
> *以下内容取自[MaiMai官网](https://docs.mai-mai.org/)，您可自行查阅观看*

#### 需要编程基础吗？
是的，该Wiki需要你熟练掌握以下内容：
- 对于Python基础语法有较深层次的了解
- 对MaiMai有最基础的了解，能自行搭建MaiMai BOT，而不是使用一键包等搭建 
> 如何确保自己已经熟悉了Python基础语法？
> - `print("hello")` > 输出消息
> - `def BaseSpeak(message)` > 定义函数
> - `message = input()` > 输入消息

接下来是一串基本的逻辑代码：
~~~python
def BaseSpeak(message: str):
    print(message)

message = input()
print("正在返回函数结果...")

#调用函数
BaseSpeak(message)
~~~

能大概知道这其中的意思吗？
当然，这只是**最基础**的内容，如果想要继续知道更深层次的东西，就要自行去探索，可以使用现如今较为厉害的**DeepSeek**或**Claude AI**，都不失为一种极好的策略

*~~但知不知道Claude AI是一回事，能不能用到Claude AI就是另一回事了~~，这里笔者推荐[Xsimple官网](https://xsimplechat.com/)来使用Claude AI*

***
那么笔者这里大概就只想说这么多，接下来请跟随我一起踏入一个崭新的世界吧！
顺便感谢您看到这里喵！

> Made from FuLuzzX
> 2025/9/1 17:32最后一次编写，2025/8/31 12:00开始编写

> <img src="assets/arknights.png" width="700px" title="交给你了,M3."><br>