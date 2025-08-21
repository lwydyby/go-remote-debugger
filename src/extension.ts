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
        // 直接启动调试，让调试配置提供者处理配置
        vscode.debug.startDebugging(undefined, {
            name: 'Launch and Attach to Remote Server',
            type: 'dlv-remote',
            request: 'launch'
        });
    });


    context.subscriptions.push(disposable);
}

export function deactivate() { }