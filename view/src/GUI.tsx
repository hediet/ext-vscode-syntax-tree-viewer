import * as React from "react";
import * as ReactDOM from "react-dom";
import * as classNames from "classnames";
import { observable, computed, autorun } from "mobx";
import { observer } from "mobx-react";
import zenscroll = require("zenscroll");

import { SyntaxTreeNodeViewModel, ViewModel } from './ViewModel';

@observer
export class GUI extends React.Component<{ model: ViewModel }, {}> {
	public render() {
		const root = this.props.model.root;
		if (root) {
			return (
				<div>
					<Node model={root} />
				</div>
			);
		}
		else {
			return (
				<div>
					No syntax tree provider available. 
				</div>
			);
		}
	}
}

@observer
class Node extends React.Component<{ model: SyntaxTreeNodeViewModel }, {}> {

	private clickHandler(args: React.MouseEvent<HTMLDivElement>) {
		const model = this.props.model;
		model.collapsed = !model.collapsed;
	}

	private mouseEnterOrLeaveHandler(enter: boolean) {
		const model = this.props.model;
		if (model.viewModel.hoveredNode)
			model.viewModel.hoveredNode.isHovered = false;
		model.viewModel.hoveredNode = enter ? model : null;
		model.isHovered = enter;
	}

	private disposable: (() => void)|undefined;

	@observable
	private div: HTMLElement;

	private setDiv = (div: HTMLElement) => this.div = div;

	public componentWillMount() {
		if (this.disposable) { this.disposable(); this.disposable = undefined; }

		this.disposable = autorun(() => {
			if (this.props.model.isInnerMostSelected && this.div) {
				console.log(this.props.model.isInnerMostSelected);
				console.log(this.div);
				zenscroll.intoView(this.div);
			}
		});
	}

	public componentWillUnmount() {
		if (this.disposable) { this.disposable(); this.disposable = undefined; }
	}

	public render(): JSX.Element {
		const model = this.props.model;

		return (
			<div ref={this.setDiv} className={classNames("tree-node", 
					model.collapsed && "collapsed", 
					model.isSelected && "selected",
					model.isInnerMostSelected && "innerMostSelected",
					model.isHovered && "hovered",
					(model.isChildOrThisHovered && !model.isHovered) && "childHovered",
					(model.isParentOrThisHovered && !model.isHovered) && "parentHovered")}
					
					onMouseOver={(e) => { this.mouseEnterOrLeaveHandler(true); e.stopPropagation(); }}
					onMouseOut={(e) => { this.mouseEnterOrLeaveHandler(false); e.stopPropagation(); }}
					>

				<div className="header">
					<span onClick={this.clickHandler.bind(this)}>
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
							{model.children.map((c, idx) => <Node model={c} key={idx} />)}
						</div>
					</div>
				}
			</div>
		);
	}
}