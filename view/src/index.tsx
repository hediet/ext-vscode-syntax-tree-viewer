import * as React from "react";
import * as ReactDOM from "react-dom";
import { DecoratedServiceReflector } from "hediet-remoting";

import { SyntaxTreeNode, SyntaxTreeViewBackend, SyntaxTreeViewFrontend, Address } from '../../src/interfaces';
import { WebsocketViewConnector } from "./WebsocketClient";
import { ViewModel } from "./ViewModel";
import { GUI } from "./GUI";

import "./style.scss";

const model = new ViewModel();

var target = document.createElement("div");
ReactDOM.render(<GUI model={model} />, target);
document.body.appendChild(target);

if (WebsocketViewConnector.isLaunchedFromVsCode()) {
	new WebsocketViewConnector(
		new DecoratedServiceReflector(SyntaxTreeViewBackend), 
		new DecoratedServiceReflector(SyntaxTreeViewFrontend), model, 
			server => model.setServerModel(server))
			.stayConnected();
}
else {
	const sampleTree = require("./sample-input.json");
	model.setSubTree([], sampleTree);
}