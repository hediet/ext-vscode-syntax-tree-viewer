import { RemotingServer, StreamChannel, MessageStream, Channel, createProxy, DecoratedServiceReflector, ServiceInfo } from "hediet-remoting";
import { SocketIOServer } from "hediet-remoting-socketio-server";
import { Deferred } from "hediet-framework/api/synchronization";

import { ClientRegistry, Address } from './interfaces';

class ClientRegistryImpl implements ClientRegistry {
	constructor(private callback: (connectionKey: string) => Promise<void>) {}

	public async register(connectionKey: string): Promise<void> {
		return this.callback(connectionKey);
	}
}

type ProxyQueryService = <T>(info: ServiceInfo<T>, remoteId?: string) => T;
type WaitForSingleClientRegistrationCallback = (connectToClientService: ProxyQueryService, remotingServer: RemotingServer, onClientDisconnected: Promise<void>) => Promise<void>;

export class WebsocketServer {
	private clientRegistrationCallbackStore = new Map<string, { callback: WaitForSingleClientRegistrationCallback, resolvePromise: () => void }>();
	private key: number = 0;

	constructor() {
		const addr = this.getConnectionAddress("");
		new SocketIOServer(addr.port, this.onClientConnect.bind(this), { host: addr.host });
	}

	public getUniqueKey(): string {
		this.key++;
		return this.key.toString();
	}

	private onClientConnect(stream: MessageStream) {
		const server = new RemotingServer();
		const deferredChannel = new Deferred<StreamChannel>();

		const registry = new ClientRegistryImpl(async (connectionKey) => {
			const val = this.clientRegistrationCallbackStore.get(connectionKey);
			if (!val) throw "Unexpected incoming connection";
			
			const { callback, resolvePromise } = val;

			//this.clientRegistrationCallbackStore.delete(connectionKey);

			const channel = await deferredChannel.value;

			function connectToClientService<T>(info: ServiceInfo<T>, remoteId?: string): T {
				return createProxy(channel, info, remoteId);
			};

			await callback(connectToClientService, server, stream.onClosed);
			resolvePromise();
		});

		server.registerObject(new DecoratedServiceReflector(ClientRegistry), registry);
		deferredChannel.setValue(new StreamChannel(stream, server));
	}

	public getConnectionAddress(connectionKey: string): Address {
		return { extensionId: "", host: "localhost", key: connectionKey, port: 1235 };
	}

	public waitForSingleClientRegistration(connectionKey: string, callback: WaitForSingleClientRegistrationCallback): Promise<void> {
		return new Promise<void>((resolvePromise) => {
			this.clientRegistrationCallbackStore.set(connectionKey, { callback, resolvePromise });
		});
	}
}