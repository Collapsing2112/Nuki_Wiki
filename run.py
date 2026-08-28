import os
import subprocess

# 切换到脚本所在目录（这样服务器根目录就是脚本所在文件夹）
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# 启动一个新的 CMD 窗口，并执行 HTTP 服务器命令
# /k 表示执行完命令后保留窗口（方便查看输出和错误）
subprocess.Popen(['cmd', '/k', 'python -m http.server 8000'], shell=True)