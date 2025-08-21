import * as vscode from 'vscode';
import { DlvDebugProvider } from './debugProvider';

export function activate(context: vscode.ExtensionContext) {
    const provider = new DlvDebugProvider();
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('dlv-remote', provider));

    // 注册调试会话结束事件处理器
    vscode.debug.onDidTerminateDebugSession(async (session) => {
        if (session.configuration.type === 'go' && session.configuration.tag === 'dlv-remote') {
            // 在这里执行清理操作
            const providerAny: any = provider;
            if (typeof providerAny.cleanupRemote === 'function') {
                await providerAny.cleanupRemote(session.configuration);
            }
        }
    });

    let disposable = vscode.commands.registerCommand('dlv-debug.startDebugging', () => {
        // 从配置中读取 host、port 和 servername
        const config = vscode.workspace.getConfiguration('dlvDebug');
        const host = config.get('remoteHost', '10.37.14.157');
        const port = config.get('remotePort', 40002);
        const servername = config.get('serverName', 'jedi-apiserver'); // 修改默认值与debugProvider.ts一致
        const cwd = config.get('cwd', '${workspaceFolder}'); // 修正默认值
        const remotePath = config.get('remotePath', '${workspaceFolder}/' + servername); // 修正默认值

        vscode.debug.startDebugging(undefined, {
            name: 'dlv-remote',
            type: 'dlv-remote',
            request: 'launch',
            host: host,
            port: port,
            servername: servername,
            remotePath: remotePath,
            cwd: cwd
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }