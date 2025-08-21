import * as vscode from 'vscode';

export class DlvTaskProvider implements vscode.TaskProvider {
	static DlvBuildType = 'dlv-debug-build-and-deploy';
	static DlvCleanupType = 'dlv-debug-cleanup-remote';

	constructor(workspaceRoot: string) {
		// 构造函数
	}

	provideTasks(): vscode.ProviderResult<vscode.Task[]> {
		return this.getTasks();
	}

	resolveTask(_task: vscode.Task): vscode.ProviderResult<vscode.Task> | undefined {
		const type = _task.definition.type;
		if (type === DlvTaskProvider.DlvBuildType || type === DlvTaskProvider.DlvCleanupType) {
			return this.getTasks().find(task => task.definition.type === type);
		}
		return undefined;
	}

	private getTasks(): vscode.Task[] {
		const tasks: vscode.Task[] = [];
		
		// 从配置中读取参数
		const config = vscode.workspace.getConfiguration('dlvDebug');
		const host = config.get('remoteHost', '10.37.14.157');
		const port = config.get('remotePort', 40002);
		const servername = config.get('serverName', 'apiserver');
		const serverpath = config.get('serverpath', '/root/debug');

		// 添加构建和部署任务
		const buildTask = new vscode.Task(
			{ type: DlvTaskProvider.DlvBuildType },
			vscode.TaskScope.Workspace,
			DlvTaskProvider.DlvBuildType,
			'dlv-debug',
			new vscode.ShellExecution('bash', [
				'-c',
				`cd ${servername} && GOOS=linux GOARCH=amd64 go build -o ${servername} ./cmd/ && ` +
				`ssh -o "User=root" ${host} "rm -f ${serverpath}/${servername}" && ` +
				`scp -o "User=root" ./${servername} root@${host}:${serverpath}/${servername}/ && ` +
				`rm -f ${servername}/${servername} && ` +
				`ssh -o "User=root" ${host} "cd ${serverpath}/${servername} && chmod +x ${servername}" && ` +
				`ssh -o "User=root" ${host} "cd ${serverpath}/${servername} && PATH=\"\$PATH:/usr/local/go/bin\" nohup /usr/local/bin/dlv --listen=:${port} --headless=true --api-version=2 --accept-multiclient exec ./${servername} > /dev/null 2>&1 &"`
			])
		);
		tasks.push(buildTask);

		// 添加清理远程任务
		const cleanupTask = new vscode.Task(
			{ type: DlvTaskProvider.DlvCleanupType },
			vscode.TaskScope.Workspace,
			DlvTaskProvider.DlvCleanupType,
			'dlv-debug',
			new vscode.ShellExecution('bash', [
				'-c',
				`ssh -o "User=root" ${host} "pkill -9 ${servername}; pkill -9 dlv"`
			])
		);
		tasks.push(cleanupTask);

		return tasks;
	}
}