from app import app
import webbrowser
import threading
import time
import sys
import os

# 设置静态文件目录
app.static_folder = 'static'

def open_browser():
    time.sleep(2)
    webbrowser.open('http://localhost:5000')

if __name__ == '__main__':
    print("EVE Online Log分析系统 - 桌面应用")
    print("==================================================")
    print("正在启动应用...")
    print("访问地址: http://localhost:5000")
    print("按 Ctrl+C 停止应用")
    print("==================================================")
    
    # 启动浏览器
    threading.Thread(target=open_browser).start()
    
    # 运行Flask应用
    app.run(debug=False, host='localhost', port=5000)
