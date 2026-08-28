# 认识 MaiBot-Napcat-Adapter <span style="font-size: 15px;">`文章分级[S]`</span>

<img src="assets\showing\6.png" width="1100px" title="版本更新"><br>

***

#### MaiBot-Napcat-Adapter究竟是干什么用的？

* MaiBot-Napcat-Adapter是一个“中转站”，中转什么？中转Napcat从QQ获取到的消息，转换为Mai-Bot主体能读懂的消息

那么结果很明显，如果我们需要扩展MaiMai所能获取到的消息，那么必然就需要从这部分代码进行拓展。怎么拓展？
* 翻阅MaiBot-Napcat-Adapter的文件夹，我们能在`MaiBot-Napcat-Adapter\src\recv_handler`里找到我们接受消息的负责文件`notice_handler.py`
* 打开`notice_handler.py`，你会发现里面的代码真是：太！多！了！，不要害怕，这时请到我们的~~Claude AI~~，额不是，有Wiki就不要怕了喵！
* 回到实际，当我们在日常运行MaiMai时，你会发现如下的问题：
> MaiBot-Napcat-Adapter在接受一些消息时会显示：该信息暂时不支持接受

* 这是怎么回事？如果你查阅`notice_handler.py`的源码，会发现部分参数其实Napcat是能获取的，但是因为MaiBot-Napcat-Adapter没做好适配，所以也就忽略了这方面的参数信息
> 那么目标就很简单了，只需要查阅Napcat的官方API，然后在增加支持你需要的接收信息参数就好了！

说起来容易，做出来难，笔者也问了Claude AI才浅浅了解了这部分代码该怎么做。在这里，笔者就以如何获取用户对于MaiMai的**消息表情回复**为例：

~~~python
async def get_user_info(self, user_id: int, group_id: int = None) -> UserInfo:
    """
    获取用户信息
    
    Args:
        user_id: 用户ID
        group_id: 群组ID（可选）
        
    Returns:
        UserInfo: 用户信息对象
    """
    try:
        user_nickname = f"用户{user_id}"
        user_cardname = ""
        
        if group_id:
            # 修正：添加 server_connection 参数，并使用正确的参数顺序
            member_info = await get_member_info(self.server_connection, group_id, user_id)
            if member_info:
                user_nickname = member_info.get("nickname", f"用户{user_id}")
                user_cardname = member_info.get("card", "")
        else:
            # 获取陌生人信息，也需要添加 server_connection 参数
            stranger_info = await get_stranger_info(self.server_connection, user_id)
            if stranger_info:
                user_nickname = stranger_info.get("nickname", f"用户{user_id}")
        
        # 使用正确的参数名称创建 UserInfo
        return UserInfo(
            platform=global_config.maibot_server.platform_name,
            user_id=user_id,
            user_nickname=user_nickname,
            user_cardname=user_cardname,
        )
    except Exception as e:
        logger.error(f"获取用户信息失败: {e}")
        # 返回默认用户信息
        return UserInfo(
            platform=global_config.maibot_server.platform_name,
            user_id=user_id,
            user_nickname=f"用户{user_id}",
            user_cardname="",
        )

async def handle_emoji_like_notify(self, raw_message: dict, group_id: int) -> tuple[Seg, UserInfo]:
    """
    处理群消息表情回应通知
    
    Args:
        raw_message: 原始消息数据
        group_id: 群组ID
        
    Returns:
        tuple[Seg, UserInfo]: 处理后的消息段和用户信息
    """
    user_id = raw_message.get("user_id")
    message_id = raw_message.get("message_id")  # 被回应的消息ID
    emoji_id = raw_message.get("emoji_id")  # 表情ID
    emoji_name = raw_message.get("emoji")  # 表情名称
    
    # 获取用户信息
    user_info: UserInfo = await self.get_user_info(user_id, group_id)
    
    # 构建通知消息，使用 user_cardname 或 user_nickname
    display_name = user_info.user_cardname or user_info.user_nickname
    
    if emoji_name:
        content = f"{display_name} 对消息使用了表情回应: {emoji_name}"
    else:
        content = f"{display_name} 对消息使用了表情回应"
    
    # 修正：使用正确的 Seg 创建方式
    handled_message = Seg(
        type="text",
        data=content,
    )
    
    logger.info(f"用户 {display_name} 对消息 {message_id} 使用表情回应: {emoji_name}")
    
    return handled_message, user_info
~~~
这部分代码是干什么用的？如果你仔细地看了代码的话，你就会发现，这部分代码是获取用户回复的消息ID和表情ID，最后返回MaiBot主体的一块函数。
如果想让MaiMai知道我们回复了什么表情，我们便可以通过字典映射来告诉MaiMai这个回复的表情是什么意思。但随后，新的问题发现了：
> 2025-08-30 16:52:15 | INFO | src.recv_handler.notice_handler:handle_emoji_like_notify:261 - 用户 FuLuzzX 对消息 49657918 使用表情回应: None

MaiBot-Napcat-Adapter返回的使用表情回应竟然是None？这该怎么办？
很明显笔者在编写这段代码时也没有想到这个问题的解决办法，但我们可以查阅[Napcat官网](https://napneko.github.io/)的完整接口定义来知晓Napcat所返回的表情回应通知究竟是什么类型：
~~~typesccript
interface MsgEmojiLike {
    emoji_id: string,   // 表情 ID
    count: number       // 回应数量
}

class OB11GroupMsgEmojiLikeEvent extends OB11GroupNoticeEvent {
    notice_type = 'group_msg_emoji_like';  // 表情回应
    message_id: number;                    // 消息 ID
    likes: MsgEmojiLike[];                 // 表情信息列表
}
~~~
好像不是很难？那我们根据所知晓的接口返回类型再优化下代码：
~~~python
# 在 NoticeType 类中添加
class NoticeType:
    # ... 其他类型
    group_msg_emoji_like = "group_msg_emoji_like"  # 群消息表情回应
~~~

~~~python
async def handle_notice(self, raw_message: dict):
    """
    处理通知消息
    """
    notice_type = raw_message.get("notice_type")
    message_time: float = time.time()

    group_id = raw_message.get("group_id")
    user_id = raw_message.get("user_id")
    target_id = raw_message.get("target_id")

    handled_message: Seg = None
    user_info: UserInfo = None
    system_notice: bool = False

    match notice_type:
        # ... 其他 case
        case NoticeType.group_msg_emoji_like:
            logger.info("处理群消息表情回应")
            handled_message, user_info = await self.handle_emoji_like_notify(raw_message, group_id)
        # ... 其他 case

    # ... 后续处理逻辑

async def handle_emoji_like_notify(self, raw_message: dict, group_id: int) -> tuple[Seg, UserInfo]:
    """
    处理群消息表情回应通知
    
    Args:
        raw_message: 原始消息数据
        group_id: 群组ID
        
    Returns:
        tuple[Seg, UserInfo]: 处理后的消息段和用户信息
    """
    user_id = raw_message.get("user_id")
    message_id = raw_message.get("message_id")
    likes = raw_message.get("likes", [])  # 表情信息列表
    
    logger.debug(f"表情回应原始数据: {raw_message}")
    logger.debug(f"表情列表: {likes}")
    
    # 获取用户信息
    user_info: UserInfo = await self.get_user_info(user_id, group_id)
    display_name = user_info.user_cardname or user_info.user_nickname
    
    # 解析表情信息
    emoji_details = []
    total_reactions = 0
    
    for like in likes:
        emoji_id = like.get("emoji_id")
        count = like.get("count", 1)
        total_reactions += count
        
        # 获取表情显示
        emoji_display = self.get_emoji_display(emoji_id)
        if count > 1:
            emoji_display += f"×{count}"
        
        emoji_details.append(emoji_display)
    
    # 构建消息内容
    if emoji_details:
        emoji_text = "、".join(emoji_details)
        if len(emoji_details) == 1:
            content = f"{display_name} 对消息使用了表情回应: {emoji_text}"
        else:
            content = f"{display_name} 对消息使用了多个表情回应: {emoji_text} (共{total_reactions}个)"
    else:
        content = f"{display_name} 对消息使用了表情回应"
    
    # 创建消息段
    handled_message = Seg(
        type="text",
        data=content,
    )
    
    logger.info(f"用户 {display_name} 对消息 {message_id} 使用表情回应")
    logger.info(f"表情详情: {emoji_details} (总数: {total_reactions})")
    
    return handled_message, user_info

@classmethod
def get_emoji_display(cls, emoji_id: str) -> str:
    """
    根据表情ID获取表情显示
    
    Args:
        emoji_id: 表情ID
        
    Returns:
        str: 表情显示文本
    """
    if not emoji_id:
        return "[未知表情]"
    
    # 如果在映射字典中找到，返回表情符号+ID
    if emoji_id in cls.EMOJI_MAPPING:
        return f"{cls.EMOJI_MAPPING[emoji_id]}[{emoji_id}]"
    else:
        return f"[表情ID:{emoji_id}]"
~~~

太好了！如此一来我们便成功获取到了用户回复消息的表情ID~ 那么接下来的目标也很明显了！那就是：**表情映射字典**
幸好这里不是很难，我们查阅QQ官方BOT的API接口就能查到这些消息，在这里，笔者也给列出来：

~~~python
# QQ 表情映射字典 - 基于官方wiki数据（汉字版本）
EMOJI_MAPPING = {
    # 表情类型1 - QQ传统表情
    "4": "得意",
    "5": "流泪",
    "8": "睡",
    "9": "大哭",
    "10": "尴尬",
    "12": "调皮",
    "14": "微笑",
    "16": "酷",
    "21": "可爱",
    "23": "傲慢",
    "24": "饥饿",
    "25": "困",
    "26": "惊恐",
    "27": "流汗",
    "28": "憨笑",
    "29": "悠闲",
    "30": "奋斗",
    "32": "疑问",
    "33": "嘘",
    "34": "晕",
    "38": "敲打",
    "39": "再见",
    "41": "发抖",
    "42": "爱情",
    "43": "跳跳",
    "49": "拥抱",
    "53": "蛋糕",
    "60": "咖啡",
    "63": "玫瑰",
    "66": "爱心",
    "74": "太阳",
    "75": "月亮",
    "76": "赞",
    "78": "握手",
    "79": "胜利",
    "85": "飞吻",
    "89": "西瓜",
    "96": "冷汗",
    "97": "擦汗",
    "98": "抠鼻",
    "99": "鼓掌",
    "100": "糗大了",
    "101": "坏笑",
    "102": "左哼哼",
    "103": "右哼哼",
    "104": "哈欠",
    "106": "委屈",
    "109": "左亲亲",
    "111": "可怜",
    "116": "示爱",
    "118": "抱拳",
    "120": "拳头",
    "122": "爱你",
    "123": "NO",
    "124": "OK",
    "125": "转圈",
    "129": "挥手",
    "144": "喝彩",
    "147": "棒棒糖",
    "171": "茶",
    "173": "泪奔",
    "174": "无奈",
    "175": "卖萌",
    "176": "小纠结",
    "179": "doge",
    "180": "惊喜",
    "181": "骚扰",
    "182": "笑哭",
    "183": "我最美",
    "201": "点赞",
    "203": "托脸",
    "212": "托腮",
    "214": "啵啵",
    "219": "蹭一蹭",
    "222": "抱抱",
    "227": "拍手",
    "232": "佛系",
    "240": "喷脸",
    "243": "甩头",
    "246": "加油抱抱",
    "262": "脑阔疼",
    "264": "捂脸",
    "265": "辣眼睛",
    "266": "哦哟",
    "267": "头秃",
    "268": "问号脸",
    "269": "暗中观察",
    "270": "emm",
    "271": "吃瓜",
    "272": "呵呵哒",
    "273": "我酸了",
    "277": "汪汪",
    "278": "汗",
    "281": "无眼笑",
    "282": "敬礼",
    "284": "面无表情",
    "285": "摸鱼",
    "287": "哦",
    "289": "睁眼",
    "290": "敲开心",
    "293": "摸锦鲤",
    "294": "期待",
    "297": "拜谢",
    "298": "元宝",
    "299": "牛啊",
    "305": "右亲亲",
    "306": "牛气冲天",
    "307": "喵喵",
    "314": "仔细分析",
    "315": "加油",
    "318": "崇拜",
    "319": "比心",
    "320": "庆祝",
    "322": "拒绝",
    "324": "吃糖",
    "326": "生气",
    
    # 表情类型2 - Unicode表情
    "9728": "晴天",
    "9749": "咖啡",
    "9786": "可爱",
    "10024": "闪光",
    "10060": "错误",
    "10068": "问号",
    "127801": "玫瑰",
    "127817": "西瓜",
    "127822": "苹果",
    "127827": "草莓",
    "127836": "拉面",
    "127838": "面包",
    "127847": "刨冰",
    "127866": "啤酒",
    "127867": "干杯",
    "127881": "庆祝",
    "128027": "虫",
    "128046": "牛",
    "128051": "鲸鱼",
    "128053": "猴",
    "128074": "拳头",
    "128076": "好的",
    "128077": "厉害",
    "128079": "鼓掌",
    "128089": "内衣",
    "128102": "男孩",
    "128104": "爸爸",
    "128147": "爱心",
    "128157": "礼物",
    "128164": "睡觉",
    "128166": "水",
    "128168": "吹气",
    "128170": "肌肉",
    "128235": "邮箱",
    "128293": "火",
    "128513": "呲牙",
    "128514": "激动",
    "128516": "高兴",
    "128522": "嘿嘿",
    "128524": "羞涩",
    "128527": "哼哼",
    "128530": "不屑",
    "128531": "汗",
    "128532": "失落",
    "128536": "飞吻",
    "128538": "亲亲",
    "128540": "淘气",
    "128541": "吐舌",
    "128557": "大哭",
    "128560": "紧张",
    "128563": "瞪眼",
}
~~~
把这个**表情映射字典**放在函数最前面就好了！这样，我们就成功做到了让MaiMai知道了用户对你的表情回复，但是，新的问题就随之而来了：
> 我该怎么让MaiMai知道，用户对她的哪条消息回复了表情呢？

不是很难！但怎么做？我们也可以从MaiBot-Napcat-Adapter的源代码里做一些参考。翻阅`message_handler.py`的源码，我们发现了一些可以参考的代码：
从代码中可以看到有一个`_get_forward_message`方法，这说明MaiBot-Napcat-Adapter中已经有获取消息内容的机制。通过修改代码，使其适配新代码，我们做出了以下调整：

~~~python
async def auto_lift_detect(self) -> None:
    """
    自动检测禁言解除
    定期检查禁言列表中的用户是否已到解禁时间
    """
    while True:
        try:
            if len(self.banned_list) == 0:
                await asyncio.sleep(5)
                continue
                
            for ban_record in self.banned_list:
                if ban_record.user_id == 0 or ban_record.lift_time == -1:
                    continue
                    
                if ban_record.lift_time <= int(time.time()):
                    # 触发自然解除禁言
                    logger.info(f"检测到用户 {ban_record.user_id} 在群 {ban_record.group_id} 的禁言已解除")
                    self.lifted_list.append(ban_record)
                    
                    # 从禁言列表中移除
                    self.banned_list.remove(ban_record)
                    
                    # 可以在这里添加通知逻辑
                    try:
                        # 创建自然解禁通知
                        lift_seg = await self._create_natural_lift_notification(ban_record)
                        if lift_seg:
                            # 构建消息并发送通知
                            message_base = MessageBase(
                                group_id=ban_record.group_id,
                                user_id=ban_record.user_id,
                                message_seg=[lift_seg],
                                user_info=UserInfo(user_id=ban_record.user_id),
                                group_info=GroupInfo(group_id=ban_record.group_id),
                                format_info=FormatInfo()
                            )
                            await self.put_notice(message_base)
                    except Exception as e:
                        logger.error(f"处理自然解禁通知时出错: {str(e)}")
            
            await asyncio.sleep(5)  # 每5秒检查一次
            
        except Exception as e:
            logger.error(f"auto_lift_detect 运行出错: {str(e)}")
            await asyncio.sleep(5)

async def _create_natural_lift_notification(self, ban_record: BanUser) -> Optional[Seg]:
    """
    创建自然解禁通知
    
    Args:
        ban_record: 禁言记录
        
    Returns:
        Optional[Seg]: 通知消息段
    """
    try:
        # 获取用户信息
        user_info = await self.get_user_info(ban_record.user_id, ban_record.group_id)
        
        return Seg(
            type="notify",
            data={
                "sub_type": "natural_lift_ban",
                "lifted_user_info": user_info.to_dict() if user_info else None,
                "lift_time": ban_record.lift_time,
                "ban_duration": ban_record.lift_time - ban_record.ban_time if ban_record.ban_time else None
            },
        )
    except Exception as e:
        logger.error(f"创建自然解禁通知失败: {str(e)}")
        return None
~~~

好像...没什么用？貌似MaiBot-Napcat-Adapter返回的消息还是：
> 2025-08-30 17:47:17 | INFO | src.recv_handler.notice_handler:handle_emoji_like_notify:457 - 表情回应 - 用户: FuLuzzX, 消息: 1989545515, 表情: [{'emoji_id': '128514', 'count': 1}]

不要怕！继续翻阅`message_handler.py`的源码，我们又找到一个可以直接使用参考的函数`get_message_detail`！，根据这个函数，我们来重新调整下代码：

~~~python
async def get_message_content(self, message_id: int) -> str:
    """
    获取指定消息ID的消息内容
    参考message_handler.py中的get_message_detail实现
    
    Args:
        message_id: 消息ID
        
    Returns:
        str: 消息内容，获取失败返回消息ID显示
    """
    try:
        # 使用message_handler.py中的get_message_detail函数
        from src.recv_handler.message_handler import get_message_detail
        
        message_detail: dict = await get_message_detail(self.server_connection, message_id)
        
        if not message_detail:
            logger.debug(f"获取消息 {message_id} 详情失败")
            return f"消息ID:{message_id}"
        
        # 提取消息内容
        message_content = message_detail.get("message", "")
        
        if isinstance(message_content, list):
            # 处理消息链格式
            text_parts = []
            for segment in message_content:
                if isinstance(segment, dict):
                    seg_type = segment.get("type", "")
                    if seg_type == "text":
                        text_data = segment.get("data", {})
                        text_parts.append(text_data.get("text", ""))
                    elif seg_type == "image":
                        text_parts.append("[图片]")
                    elif seg_type == "at":
                        at_data = segment.get("data", {})
                        qq_num = at_data.get("qq", "")
                        text_parts.append(f"[@{qq_num}]")
                    elif seg_type == "face":
                        text_parts.append("[表情]")
                    elif seg_type == "reply":
                        text_parts.append("[回复]")
                    elif seg_type == "forward":
                        text_parts.append("[转发消息]")
                    else:
                        text_parts.append(f"[{seg_type}]")
            
            message_content = "".join(text_parts)
        elif isinstance(message_content, str):
            # 如果是字符串，可能包含CQ码，简单处理
            import re
            # 保留一些可读的CQ码信息
            message_content = re.sub(r'\[CQ:image[^\]]*\]', '[图片]', message_content)
            message_content = re.sub(r'\[CQ:at,qq=(\d+)\]', r'[@\1]', message_content)
            message_content = re.sub(r'\[CQ:face[^\]]*\]', '[表情]', message_content)
            message_content = re.sub(r'\[CQ:[^\]]+\]', '[其他]', message_content)
        
        # 限制显示长度
        if len(message_content) > 50:
            message_content = message_content[:47] + "..."
        
        # 如果内容为空，返回发送者信息
        if not message_content.strip():
            sender_info = message_detail.get("sender", {})
            sender_name = sender_info.get("nickname", "未知用户")
            return f"{sender_name}的消息"
        
        return message_content.strip()
        
    except ImportError as e:
        logger.error(f"无法导入get_message_detail函数: {str(e)}")
        return f"消息ID:{message_id}"
    except Exception as e:
        logger.debug(f"获取消息 {message_id} 内容失败: {str(e)}")
        return f"消息ID:{message_id}"
~~~

最后，让我们整理下代码，作出最终的总结版本：（完整的表情回复处理方法）

~~~python
async def handle_emoji_like_notify(self, raw_message: dict, group_id: int) -> tuple[Seg, UserInfo]:
    """
    处理群消息表情回应通知
    """
    user_id = raw_message.get("user_id")
    message_id = raw_message.get("message_id")
    likes = raw_message.get("likes", [])
    
    logger.debug(f"表情回应原始数据: {raw_message}")
    
    # 获取用户信息
    user_info: UserInfo = await self.get_user_info(user_id, group_id)
    display_name = user_info.user_cardname or user_info.user_nickname
    
    # 获取被回应的消息内容
    original_message_content = await self.get_message_content(message_id)
    
    if not likes:
        content = f"{display_name} 对消息「{original_message_content}」使用了表情回应"
    else:
        # 处理表情统计
        emoji_stats = {}
        total_count = 0
        
        for like in likes:
            emoji_id = like.get("emoji_id")
            count = like.get("count", 1)
            
            if emoji_id in emoji_stats:
                emoji_stats[emoji_id] += count
            else:
                emoji_stats[emoji_id] = count
            
            total_count += count
        
        # 构建表情显示
        emoji_displays = []
        for emoji_id, count in emoji_stats.items():
            emoji_display = self.get_emoji_display(emoji_id)
            if count > 1:
                emoji_displays.append(f"{emoji_display}×{count}")
            else:
                emoji_displays.append(emoji_display)
        
        emoji_text = "、".join(emoji_displays)
        
        if len(emoji_stats) == 1 and total_count == 1:
            content = f"{display_name} 对消息「{original_message_content}」使用了表情回应: {emoji_text}"
        else:
            content = f"{display_name} 对消息「{original_message_content}」使用了表情回应: {emoji_text} (共{total_count}个反应)"
    
    # 创建消息段
    handled_message = Seg(
        type="text",
        data=content,
    )
    
    logger.info(f"表情回应 - 用户: {display_name}, 原始消息: {original_message_content}, 表情: {likes}")
    
    return handled_message, user_info
~~~

太棒了！我们完整的做出来了MaiMai的新参数：**消息的表情回复获取**，这样MaiMai就知道我们回复了她什么表情并进行~~吐槽~~了（）
> 总结一下：
> * 想要增加一个全新的消息获取参数，首先就是要了解原先的代码逻辑和思路
> * 参考其他的源码，看看能不能找到合适的API接口能直接参考or使用
> * 学会灵活查找资料，无论是QQ官方BOT的表情映射字典，还是Napcat官网的API接口返回，都是需要我们亲自查找的
> * 灵活使用AI，但也不要完全相信AI，要加入自己思考的过程和结果
>
> 如果你学会了这部分的知识，试试给自己来个“课题挑战”？给MaiMai增加表情回复的功能吧！
> ~~如果不会也不要怕，下个章节笔者亲自来教你喵！~~

学会了吗？如果你真的只是有一些Python基础，那么学习这部分知识可能很吃力，慢慢来，总有一天会完全熟练掌握！
感谢您看到这里！

***

#### 鸣谢
* [Claude AI](https://xsimplechat.com/) - 帮笔者完成了网站的CSS文件编写
* `Nuki的秘密基地`(该群现已废弃) / `零八咖啡厅`（该群现处于封闭） 群友，给我支持和鼓励！
* [MaiMai麦麦](https://docs.mai-mai.org/) 给了我能创建一个属于自己AI的机会
* 以及，你 能看我精心制作的这个教程和Nuki Wiki，再次感谢您的支持

> Made from FuLuzzX
> 2025/9/2 19:26最后一次编写，2025/9/1 16:22开始编写