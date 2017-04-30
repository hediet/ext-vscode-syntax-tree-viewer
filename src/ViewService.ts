import * as vscode from 'vscode';
import URI = require("urijs");
import { DecoratedServiceReflector, ServiceInfo, ServiceReflector } from "hediet-remoting";

import { WebsocketServer } from "./WebsocketServer";

export type QueryArgs = { [key: string]: string|number|boolean };

export interface IHtmlContentProvider {
	getHtml(queryArgs: QueryArgs): string;
}

export class StaticViewContentProvider implements vscode.TextDocumentContentProvider {
	// this content provider is static, content never changes
	private readonly _onDidChange = new vscode.EventEmitter<vscode.Uri>();
	private readonly registeredViewsByViewName = new Map<string, IHtmlContentProvider>();

	constructor(private extensionId: string) {}

	public registerToVsCode(): vscode.Disposable {
		return vscode.workspace.registerTextDocumentContentProvider(this.scheme, this);
	}
	get onDidChange(): vscode.Event<vscode.Uri> { return this._onDidChange.event; }

	public get scheme() { return `${this.extensionId}-static-view`; }

	public getViewUri(viewName: string, queryArguments: QueryArgs): string {
		const uri = new URI().scheme(this.scheme).domain("authority").path(viewName).query(queryArguments);
		return uri.toString();
	}

	public registerView(viewId: string, content: IHtmlContentProvider) {
		if (this.registeredViewsByViewName.has(viewId)) throw new Error(`A view with id '${viewId}' has already been registered.`);
		this.registeredViewsByViewName.set(viewId, content);
	}

	public provideTextDocumentContent(uri: vscode.Uri): string {
		const parsedUri = new URI(uri.toString(true));
		const viewName = parsedUri.path().substr(1);
		
		const content = this.registeredViewsByViewName.get(viewName);
		if (!content) throw new Error(`No view with id '${viewName}' has been registered.`);

		const args = parsedUri.query(true) as QueryArgs;

		const html = content.getHtml(args);
		return html;
	}	
}

export class HtmlJsLoaderContent implements IHtmlContentProvider {

	constructor(private readonly jsPath: string, private readonly title: string = "") {}

	public getHtml(queryArgs: QueryArgs): string {
		return `<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<title>${this.title}</title>
			</head>
			<body>
			<script type="text/javascript" src="${this.jsPath}"></script>
			</body>
			</html>`;
	}
}

export class RedirectContent implements IHtmlContentProvider {
	public getHtml(queryArgs: QueryArgs): string {
		const targetUrl = queryArgs["targetUrl"];
		return `<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
			</head>
			<body>
			<script type="text/javascript">
				window.location = ${JSON.stringify(targetUrl)};
			</script>
			</body>
			</html>`;
	}
}

export class TabView {
	public readonly isVisible: boolean = true; // also not supported in vs code

	public close() {
		// currently not supported by vs code.
	}
}

export interface ITabViewFactory {
	createTabView(column: vscode.ViewColumn, title: string, queryArgs: QueryArgs): Promise<TabView>;
}

export class StaticJsViewFactory implements ITabViewFactory {
	constructor(private readonly viewId: string, jsPath: string, private readonly provider: StaticViewContentProvider) {
		provider.registerView(viewId, new HtmlJsLoaderContent(jsPath));
	}

	public async createTabView(column: vscode.ViewColumn, title: string, queryArgs: QueryArgs): Promise<TabView> {
		const uri = this.provider.getViewUri(this.viewId, queryArgs);
		await (vscode.commands.executeCommand('vscode.previewHtml', uri, column, title) as PromiseLike<{}>);
		return new TabView();
	}
}

export class SelfHostedViewFactory implements ITabViewFactory {
	private readonly redirectViewId = "redirect";

	constructor(private readonly targetUrl: vscode.Uri, private readonly provider: StaticViewContentProvider) {
		this.provider.registerView(this.redirectViewId, new RedirectContent());
	}

	public async createTabView(column: vscode.ViewColumn, title: string, queryArgs: QueryArgs): Promise<TabView> {
		const targetUrl = new URI(this.targetUrl.toString()).query(queryArgs);

		console.log(`Go to ${targetUrl.toString()} to open view ${title}.`);

		const uri = this.provider.getViewUri(this.redirectViewId, { targetUrl: targetUrl.toString() });
		await (vscode.commands.executeCommand('vscode.previewHtml', uri, column, title) as PromiseLike<{}>);
		return new TabView();
	}
}

export class BrowserViewFactory implements ITabViewFactory {
	constructor(private readonly targetUrl: vscode.Uri) {}

	public async createTabView(column: vscode.ViewColumn, title: string, queryArgs: QueryArgs): Promise<TabView> {
		const targetUri = new URI(this.targetUrl.toString()).query(queryArgs);
		console.log(`Go to ${targetUri.toString()} to open view ${title}.`);
		return new TabView();
	}
}

export class WebpackWebsocketView<TServerModel, TClientModel> {
	constructor(private readonly tabViewFactory: ITabViewFactory,
			private readonly server: WebsocketServer,
			private readonly serverServiceInfo: ServiceReflector<TServerModel>,
			private readonly clientServiceInfo: ServiceInfo<TClientModel>) {
	}

	public async show(column: vscode.ViewColumn, title: string, serverService: TServerModel, 
			clientConnectedHandler: (client: TClientModel, onClientDisconnected: Promise<void>) => Promise<void>): Promise<TabView> {
		const key = this.server.getUniqueKey();

		const promise = this.server.waitForSingleClientRegistration(key, async (connectToClientService, remotingServer, onClientDisconnected) => {
			const clientService = connectToClientService(this.clientServiceInfo);
			await clientConnectedHandler(clientService, onClientDisconnected);
			remotingServer.registerObject(this.serverServiceInfo, serverService);
		});

		const tabView = this.tabViewFactory.createTabView(column, title, { address: JSON.stringify(this.server.getConnectionAddress(key)) })

		await promise;

		return tabView;
	}
}