import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export class DlvDebugProvider implements vscode.DebugConfigurationProvider {
	async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration | undefined> {
		// 如果没有配置，则使用默认配置
		if (!config.type && !config.request && !config.name) {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.languageId === 'go') {
				const debugConfig = vscode.workspace.getConfiguration('dlvDebug');
				const host = debugConfig.get('remoteHost', '10.37.14.157');
				const port = debugConfig.get('remotePort', 40002);
				const servername = debugConfig.get('serverName', 'apiserver');
				const remotePath = debugConfig.get('remotePath', '');
				const cwd = debugConfig.get('cwd', '');
				config.type = 'dlv-remote';
				config.mode = 'remote';
				config.name = 'Server Remote Debug';
				config.request = 'launch';  // 改为launch
				config.host = host;
				config.port = port;
				config.servername = servername;
				config.remotePath = remotePath;
				config.cwd = cwd;
			}
		}

		// 对于launch请求，执行构建和部署，然后自动attach
		if (config.request === 'launch') {
			vscode.window.showInformationMessage('Starting build and deploy process...');
			const success = await this.buildAndDeploy(config);
			if (!success) {
				vscode.window.showErrorMessage('Build and deploy failed');
				return undefined; // 取消调试会话
			}
			
			// 构建和部署成功后，自动切换到attach模式
			config.request = 'attach';
			config.type = 'go'
			config.mode = 'remote';
			config.tag = 'dlv-remote';
			vscode.window.showInformationMessage('Build and deploy completed, attaching to debugger...');
		}

		// 对于attach请求，直接返回配置
		if (config.request === 'attach') {
			vscode.window.showInformationMessage('Attaching to remote debugger...');
			return config;
		}

		return config;
	}

	private async buildAndDeploy(config: vscode.DebugConfiguration): Promise<boolean> {
		const debugConfig = vscode.workspace.getConfiguration('dlvDebug');
		const host = debugConfig.get('remoteHost', '10.37.14.157');
		const port = debugConfig.get('remotePort', 40002);
		const servername = debugConfig.get('serverName', 'apiserver');
		const serverpath = debugConfig.get('serverpath', '/root/debug');
		const isSubProject = debugConfig.get('isSubProject', false);
		const cwdRelativePath = debugConfig.get('mainPath', './cmd');
		 
		// 获取工作区根路径
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder found');
			return false;
		}
		const cwd = path.join(workspaceFolder.uri.fsPath, cwdRelativePath);
		let projectPath;
		if (isSubProject) {
			projectPath = path.join(workspaceFolder.uri.fsPath, servername);
		} else {
			projectPath = workspaceFolder.uri.fsPath;
		}
	
		// 检查项目路径是否存在
		if (!fs.existsSync(projectPath)) {
			vscode.window.showErrorMessage(`Project path does not exist: ${projectPath}`);
			return false;
		}
	
		// 构建命令
		const buildCmd = `cd ${projectPath} && GOOS=linux GOARCH=amd64 go build -o ${servername} ${cwd}`;
	
		// 部署命令
		const deployCmd = `ssh -o "User=root" ${host} "rm -f ${projectPath}/${servername}" && ` +
			`scp -o "User=root" ${projectPath}/${servername} root@${host}:${serverpath}/${servername} && ` +
			`ssh -o "User=root" ${host} "cd ${serverpath} && chmod +x ${servername}" && ` +
			`ssh -o "User=root" ${host} "nohup /usr/local/bin/dlv --listen=:${port} --headless=true --api-version=2 --accept-multiclient exec ${serverpath}/${servername} > /dev/null 2>&1 &"`;
	
		const fullCmd = `${buildCmd} && ${deployCmd}`;
	
		vscode.window.showInformationMessage('Building and deploying server...');
	
		return new Promise((resolve) => {
			// 在 cp.exec 回调函数中添加参数类型
			cp.exec(fullCmd, { cwd: workspaceFolder.uri.fsPath }, async (error: cp.ExecException | null, stdout: string, stderr: string) => {
				if (error) {
					vscode.window.showErrorMessage(`Build and deploy failed: ${error.message}`);
					console.error(`Build and deploy stderr: ${stderr}`);
					resolve(false);
					return;
				}
				
				// 等待dlv完全启动
				const isDlvReady = await this.waitForDlv(host, port, 10); // 最多等待10次，每次1秒
				if (!isDlvReady) {
					vscode.window.showErrorMessage('dlv failed to start within timeout');
					resolve(false);
					return;
				}
				
				vscode.window.showInformationMessage('Server built and deployed successfully, dlv is ready');
				resolve(true);
			});
		});
	}
	
	// 添加等待dlv启动的方法
	private async waitForDlv(host: string, port: number, maxRetries: number): Promise<boolean> {
		for (let i = 0; i < maxRetries; i++) {
			try {
				// 检查端口是否在监听
				const checkCmd = `ssh -o "User=root" ${host} "netstat -tuln | grep :${port}"`;
				const result = await this.executeCommand(checkCmd);
				if (result && result.includes(`:${port}`)) {
					return true; // dlv已启动并监听端口
				}
			} catch (error) {
				console.error(`Error checking dlv status: ${error}`);
			}
			
			// 等待1秒后重试
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
		
		return false; // 超时未启动
	}
	
	// 添加执行命令的辅助方法
	private async executeCommand(cmd: string): Promise<string> {
		return new Promise((resolve, reject) => {
			cp.exec(cmd, (error: cp.ExecException | null, stdout: string, stderr: string) => {
				if (error) {
					reject(error);
				} else {
					resolve(stdout);
				}
			});
		});
	}

	// 在 cleanupRemote 方法中也添加参数类型
	private async cleanupRemote(config: vscode.DebugConfiguration): Promise<void> {
	    const debugConfig = vscode.workspace.getConfiguration('dlvDebug');
	    const host = config.host || debugConfig.get('remoteHost', '10.37.14.157');
	    const servername = config.servername || debugConfig.get('serverName', 'apiserver');
	    
	    const cleanupCmd = `ssh -o "User=root" ${host} "pkill -9 ${servername}; pkill -9 dlv"`;
	    
	    vscode.window.showInformationMessage('Cleaning up remote server...');
	    
	    cp.exec(cleanupCmd, (error: cp.ExecException | null, stdout: string, stderr: string) => {
	        if (error) {
	            vscode.window.showErrorMessage(`Cleanup failed: ${error.message}`);
	            console.error(`Cleanup stderr: ${stderr}`);
	            return;
	        }
	        
	        vscode.window.showInformationMessage('Remote server cleaned up successfully');
	    });
	}
}