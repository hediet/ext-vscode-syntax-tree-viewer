import { RemotingServer, ServiceInfo, StreamChannel, createProxy, createProxyByClass, DecoratedServiceReflector, ServiceReflector, MessageStream } from "hediet-remoting";
import { connect } from "hediet-remoting-socketio-client";
import * as uri from "urijs";

import { Address, ClientRegistry } from "../../src/interfaces";

export class WebsocketClient {
	public static async connect(server: Address, remotingServer: RemotingServer): Promise<WebsocketClient> {
		const clientStream = connect(`http://${server.host}:${server.port}`);
		const channel = new StreamChannel(clientStream, remotingServer);
		
		const registry = createProxyByClass(channel, ClientRegistry);
		await registry.register(server.key);

		return new WebsocketClient(clientStream, channel);
	}

	private constructor(private readonly stream: MessageStream, private readonly channel: StreamChannel) {}

	public connectToServerService<T>(info: ServiceInfo<T>, remoteId?: string): T {
		return createProxy(this.channel, info, remoteId);
	}

	public onDisconnected = this.stream.onClosed;
}

export class WebsocketViewConnector<TServerModel, TClientModelInterface, TClientModel extends TClientModelInterface> {
	private remotingServer: RemotingServer;
	constructor(private readonly serverServiceInfo: ServiceInfo<TServerModel>,
			private readonly clientServiceInfo: ServiceReflector<TClientModelInterface>, clientModel: TClientModel,
			private readonly onConnectionStatusChanged: (currentServer: TServerModel|null, isConnected: boolean) => void) {

		const elem = document.getElementById("_defaultStyles");
		if (elem) {
			elem.remove();
		}

		this.remotingServer = new RemotingServer();
		this.remotingServer.registerObject(clientServiceInfo, clientModel);
	}

	public async stayConnected(): Promise<never> {
		const address = WebsocketViewConnector.getAddress();
		if (!address) throw "No address information - query parameter 'address' is missing.";

		while (true) {
			const client = await WebsocketClient.connect(address, this.remotingServer);
			const serverModel = client.connectToServerService(this.serverServiceInfo);
			this.onConnectionStatusChanged(serverModel, true);
			await client.onDisconnected;
			this.onConnectionStatusChanged(null, false);
		}
	}

	public static isLaunchedFromVsCode() {
		return this.getAddress() !== undefined;
	}

	private static getAddress(): Address|undefined {
		const url = uri.parse(this.getCurrentUrl());
		const args = uri.parseQuery(url.query) as any;
		if (args["address"] === undefined) return undefined;
		const address = JSON.parse(args["address"]);
		return address as Address;
	}

	private static getCurrentUrl(): string {
		const items = document.getElementsByTagName("base");
		if (items.length === 0) return document.location.href;
		return items.item(0).href;
	}
}