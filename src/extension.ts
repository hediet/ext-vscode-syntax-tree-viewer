import { basename } from 'path';
import * as vscode from 'vscode';
import { DecoratedServiceReflector, ServiceInfo } from "hediet-remoting";

import { WebsocketServer } from './WebsocketServer';
import { SyntaxTreeViewBackend, SyntaxTreeViewFrontend } from './interfaces';
import {
	ITabViewFactory,
	BrowserViewFactory,
	StaticJsViewFactory,
	SelfHostedViewFactory,
	StaticViewContentProvider,
	WebpackWebsocketView
} from './ViewService';
import { ModelService } from "./ModelService";
import { SyntaxTreeViewBackendImpl } from "./SyntaxTreeViewBackendImpl";

export function activate(context: vscode.ExtensionContext) {
	const server = new WebsocketServer();
	const staticViewContentProvider = new StaticViewContentProvider(basename(context.extensionPath));
	context.subscriptions.push(staticViewContentProvider.registerToVsCode());

	const modelService = new ModelService();
	context.subscriptions.push(modelService.registerToVsCode());

	let tabViewFactory: ITabViewFactory = ((mode: string) => {
		switch (mode) {
			case "static": return new StaticJsViewFactory("main", __dirname + "/view/main.js", staticViewContentProvider);
			case "browser": return new BrowserViewFactory(vscode.Uri.parse("http://localhost:8080"));
			case "dynamic": return new SelfHostedViewFactory(vscode.Uri.parse("http://localhost:8080"), staticViewContentProvider);
			default: throw "Unsuported";
		}
	})("dynamic");

	const mainView = new WebpackWebsocketView(tabViewFactory, server, 
		new DecoratedServiceReflector(SyntaxTreeViewBackend), 
		new DecoratedServiceReflector(SyntaxTreeViewFrontend));
	
	context.subscriptions.push(vscode.commands.registerCommand('syntaxtree.show', async () => {
		const docUri = vscode.window.activeTextEditor.document.uri;
		const hideStatusBarMsg = vscode.window.setStatusBarMessage("Loading view...");

		const serverService = new SyntaxTreeViewBackendImpl(docUri);
		modelService.addModel(serverService);
 
		await mainView.show(vscode.ViewColumn.Two, `Syntax Tree`, serverService, 
			async (clientInterface, onClientDisconnected) => { 
				serverService.setFrontend(clientInterface);
				onClientDisconnected.then(() => serverService.setFrontend(null)); 
			});
		
		hideStatusBarMsg.dispose();
	}));
}

export function deactivate() {
}