import { notificationHandler, requestHandler } from "hediet-remoting";

export interface Address {
	port: number;
	host: string;
	extensionId: string;
	key: string;
}

export interface SyntaxTreeNode {
	name: string;
	parentPropertyName: string|undefined;
	children: SyntaxTreeNode[];

	startPos: number;
	endPos: number;
}

export abstract class ClientRegistry {
	@requestHandler()
	public register(connectionKey: string): PromiseLike<void> { throw ""; }
}

export abstract class SyntaxTreeViewFrontend {
	@notificationHandler()
	public setCursorPos(pos: number): PromiseLike<void> { throw ""; }

	@notificationHandler()
	public setSubTree(path: number[], tree: SyntaxTreeNode): PromiseLike<void> { throw ""; }

	@notificationHandler()
	public resetTree(): PromiseLike<void> { throw ""; }
}

export abstract class SyntaxTreeViewBackend {
	@notificationHandler()
	public clearMarkedRegion(): PromiseLike<void> { throw ""; }

	@notificationHandler()
	public setMarkedRegion(startPos: number, endPos: number): PromiseLike<void> { throw ""; }
}