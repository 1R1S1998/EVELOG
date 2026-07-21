# EVELOG

面向 EVE Online 玩家的战斗日志分析器。

## 功能

- 解析 EVE Online 的 `.txt` 战斗日志
- 汇总伤害、输出维修、接收维修和攻击次数
- 展示武器伤害、目标分布、命中质量与事件明细
- 识别日志所有者 ID
- 支持中英文界面与响应式布局

## 本地运行

```bash
python -m http.server 4173
```

打开 `http://localhost:4173`。

## 测试

```bash
npm test
```

## 部署

项目使用 Vercel 托管，可作为静态站点直接部署。

## License

MIT
