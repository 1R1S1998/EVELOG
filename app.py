from flask import Flask, render_template
import os

# 创建Flask应用
app = Flask(__name__)

# 设置静态文件目录
app.static_folder = 'static'

# 首页路由
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    print("EVE Online Log分析系统 - Web前端")
    print("==================================================")
    print("正在启动Web服务器...")
    print("访问地址: http://localhost:5000")
    print("按 Ctrl+C 停止服务器")
    print("==================================================")
    app.run(debug=True, host='0.0.0.0', port=5000)