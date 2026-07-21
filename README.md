# EVELOG

面向 EVE Online 玩家的战斗日志分析工具。

## 功能

- 解析 `.txt` 与 `.log` 战斗日志
- 汇总伤害、输出维修、接收维修与攻击次数
- 展示目标分布、命中质量和事件回放
- 从日志中识别角色 ID
- 中英文切换与响应式布局
- 紫黑液态流光动态视觉

## 本地运行

```bash
python -m http.server 4173
```

访问 `http://localhost:4173`。

## 测试

```bash
npm test
```

## 部署

项目已配置为 Vercel 静态站点。

## License

MIT
