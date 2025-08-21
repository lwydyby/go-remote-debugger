# Go Remote Debugger

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

一个用于在远程服务器上调试Go程序的VSCode扩展插件，基于dlv调试器。

## 功能特性

- 🚀 一键构建和部署Go应用程序到远程服务器
- 🐞 使用dlv调试器进行远程调试
- ⚙️ 可配置的远程主机、端口和路径设置
- 📦 支持子项目结构
- 🔧 图形化配置界面
- 🌐 无缝集成VSCode调试体验

## 安装

### 方法一：从VSCode市场安装（发布后）
1. 打开VSCode
2. 进入扩展面板 (Ctrl+Shift+X)
3. 搜索 "Go Remote Debugger"
4. 点击安装

### 方法二：本地安装开发版本
1. 克隆此仓库到本地
2. 在项目根目录运行：
   ```bash
   npm install
   npm run compile
   ```
3. 按 `F5` 在Extension Development Host中运行插件

### 方法三：打包安装
1. 安装vsce工具：
   ```bash
   npm install -g vsce
   ```
2. 打包插件：
   ```bash
   vsce package
   ```
3. 安装生成的vsix文件：
   ```bash
   code --install-extension go-remote-debugger-1.0.0.vsix
   ```

## 使用方法


### 启动调试

1. 打开VSCode调试面板 (Ctrl+Shift+D)
2. 选择 "Launch and Attach to Remote Server" 配置
3. 按F5或点击开始调试按钮
4. 插件将自动：
   - 构建Go应用程序（交叉编译为Linux平台）
   - 部署二进制文件到远程服务器
   - 启动远程dlv调试器
   - 连接到调试器开始调试

## 调试流程

1. **构建阶段**：插件在本地构建Go应用程序，目标平台为Linux
2. **部署阶段**：通过SSH和SCP将二进制文件传输到远程服务器
3. **启动阶段**：在远程服务器上启动dlv调试器
4. **连接阶段**：VSCode连接到远程dlv调试器
5. **调试阶段**：正常使用VSCode调试功能
6. **清理阶段**：调试会话结束时清理远程进程

## 配置示例

### launch.json

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch and Attach to Remote Server",
      "type": "dlv-remote",
      "request": "launch",
      "remotePath": "${workspaceFolder}/apiserver", // 使用本地代码路径
      "port": 40002,
      "servername": "apiserver",
      "serverPath": "/root/debug",
      "isSubProject": true,
      "host": "10.37.14.157",
      "mainPath": "apiserver/cmd",
      "cwd": "${workspaceFolder}/apiserver"
    }
  ]
}
```

## 要求

- VSCode 1.60.0 或更高版本
- 远程服务器上安装了dlv调试器,且目录为/usr/local/bin/dlv 
- 本地机器能够通过SSH无密码登录到远程服务器
- Go开发环境

## 故障排除

### 连接问题

- 检查远程服务器IP和端口配置是否正确
- 确保远程服务器防火墙允许指定端口的连接
- 验证SSH连接是否正常

### 部署问题

- 检查远程服务器路径是否存在并具有适当权限
- 确保本地Go环境配置正确

### 调试问题

- 确认远程服务器上已安装dlv调试器
- 检查dlv版本兼容性

## 贡献

欢迎提交Issue和Pull Request来改进此插件。

## 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 致谢

- [Delve](https://github.com/go-delve/delve) - Go语言调试器
- [VSCode](https://code.visualstudio.com/) - 代码编辑器