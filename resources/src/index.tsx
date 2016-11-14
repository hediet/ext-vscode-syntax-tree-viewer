import * as React from "react";
import * as ReactDOM from "react-dom";
import "./style.scss";
import * as classNames from "classnames";
import { observable, computed } from "mobx";
import { observer } from "mobx-react";

export interface SyntaxTreeNode {
	name: string;
	parentPropertyName: string|undefined;
	children: SyntaxTreeNode[];

	startPos: number;
	endPos: number;
}

class SyntaxTreeNodeViewModel {
	@observable isSelected: boolean;
	@observable isHovered: boolean;
	@observable collapsed: boolean;

	@computed get isChildOrThisHovered(): boolean {
		if (this.isHovered) return true;
		return this.children.some(c => c.isChildOrThisHovered);
	}

	@computed get isParentOrThisHovered(): boolean {
		if (this.isHovered) return true;
		if (this.parent)
			return this.parent.isParentOrThisHovered;
		return false;
	}

	parent: SyntaxTreeNodeViewModel|null;

	name: string;
	parentPropertyName: string|undefined;
	children: SyntaxTreeNodeViewModel[];

	startPos: number;
	endPos: number;
}

@observer
class Node extends React.Component<{model: SyntaxTreeNodeViewModel}, {}> {

	private clickHandler(args: React.MouseEvent<HTMLDivElement>) {
		this.props.model.collapsed = !this.props.model.collapsed;
	}

	private mouseEnterOrLeaveHandler(enter: boolean) {
		const model = this.props.model;
		model.isHovered = enter;

		if (window.parent)
			window.parent.postMessage({ command: 'did-click-link', data: encodeURI('command:syntaxtree.revealNode?' 
				+ JSON.stringify([enter, model.startPos, model.endPos]))}, 'file://');
	}

	public render(): JSX.Element {
		const model = this.props.model;

		return (
			<div className={classNames("tree-node", 
					model.collapsed && "collapsed", 
					model.isSelected && "selected",
					model.isHovered && "hovered",
					(model.isChildOrThisHovered && !model.isHovered) && "childHovered", 
					(model.isParentOrThisHovered && !model.isHovered) && "parentHovered")}>

				<div className="header">
					<span onClick={this.clickHandler.bind(this)} 
						onMouseEnter={() => this.mouseEnterOrLeaveHandler(true)} 
						onMouseLeave={() => this.mouseEnterOrLeaveHandler(false)}>
						{ 
							model.parentPropertyName ? [
								<span className="parentPropertyName">{model.parentPropertyName}</span>,
								<span>: </span>
							] : [] 
						}
						<span className="name">{model.name}</span>
					</span>
					<span className="collapsedIndicator">(collapsed)</span>
				</div>
				{ model.children.length > 0 &&
					<div className={classNames("tree-children")}>
						<div className="childrenBorder">
							{model.children.map(c => <Node model={c} />)}
						</div>
					</div>
				}
			</div>
		);
	}
}


class GUI extends React.Component<{model: SyntaxTreeNodeViewModel|null}, {}> {
	render() {
		if (!this.props.model) {
			return (
				<div>
					No syntax tree provider available.
				</div>
			);
		}
		else {
			return (
				<div>
					<Node model={this.props.model} />
				</div>
			);
		}
	}
}

declare var syntaxTreeData: SyntaxTreeNode;
declare var cursorOffset: number;

function getRootNode(): SyntaxTreeNode {
	if (typeof syntaxTreeData !== "undefined") {
		return syntaxTreeData;
	}

	var json: SyntaxTreeNode = require("json!./sample-input.json");

	return json;
}

function getCursorPos(): number {
	if (typeof cursorOffset !== "undefined") {
		return cursorOffset;
	}

	return 50;
}

function createModel(root: SyntaxTreeNode, cursorPos: number, parent: SyntaxTreeNodeViewModel|null): SyntaxTreeNodeViewModel {

	var model = new SyntaxTreeNodeViewModel();
	model.name = root.name;
	model.parentPropertyName = root.parentPropertyName;
	model.startPos = root.startPos;
	model.endPos = root.endPos;
	model.parent = parent;

	model.collapsed = false;
	model.isHovered = false;
	model.isSelected = root.startPos <= cursorPos && cursorPos <= root.endPos;

	model.children = root.children.map(c => createModel(c, cursorPos, model));

	return model;
}


var target = document.createElement("div");
var rootNode = getRootNode();
var cursorPos = getCursorPos();
var model: SyntaxTreeNodeViewModel|null = null;
if (rootNode)
	model = createModel(rootNode, cursorPos, null);

ReactDOM.render(<GUI model={model} />, target);
document.body.appendChild(target);



