# EVE Online Log分析系统

一个用于分析EVE Online战斗日志的静态网页应用，支持计算DPS、维修量，以及显示战斗回放。

## 功能特性

- 📁 支持拖放和文件选择上传日志文件
- 📊 实时计算总DPS和总维修量
- 🎯 统计DPS和维修量对各目标的影响
- 📅 提取战斗开始时间和战斗ID
- 🔍 支持显示目标舰船类型
- 🎨 现代化的用户界面，响应式设计
- 📱 支持移动端访问

## 技术栈

- **前端**: 纯HTML5, CSS3, JavaScript
- **图表库**: Chart.js
- **图标库**: Font Awesome
- **部署**: 支持静态部署到Vercel、Netlify等平台


## 如何使用

1. **上传日志文件**
   - 点击或拖拽EVE Online战斗日志文件到上传区域
   - 支持 `.txt` 和 `.log` 文件格式

2. **分析日志**
   - 点击「分析Log」按钮
   - 系统会自动解析日志并计算相关数据

3. **查看结果**
   - 查看总DPS和总维修量
   - 查看DPS和维修量对各目标的影响图表
   - 查看战斗回放记录
   - 查看战斗开始时间和战斗ID

## 日志格式支持

系统支持解析EVE Online的战斗日志格式，包括：

- 伤害事件（紫色文本，color=0xff00ffff）
- 维修事件（浅绿色文本，color=0xffccff66）
- 战斗ID提取（从"收听者:"行提取）
- 目标舰船类型提取

## 项目结构

```
eve-log-analyzer/
├── index.html          # 主页面
├── static/
│   ├── css/
│   │   └── style.css   # 样式文件
│   └── js/
│       └── app.js      # 主要逻辑
├── README.md           # 项目说明
└── test_log.txt        # 测试日志文件
```

## 浏览器支持

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 注意事项

- 系统只分析用户自己的动作（color=0xff00ffff的伤害和color=0xffccff66的维修）
- 所有数据处理都在浏览器本地进行，不会上传到服务器
- 对于大型日志文件，解析可能需要一些时间

## 许可证

MIT License
