import { observable, asReference, computed, autorun } from "mobx";

import { SyntaxTreeNode, SyntaxTreeViewBackend, SyntaxTreeViewFrontend, Address } from '../../src/interfaces';

export class SyntaxTreeNodeViewModel {
	public parent: SyntaxTreeNodeViewModel|null;

	constructor(
		public readonly viewModel: ViewModel,
		public readonly startPos: number, 
		public readonly endPos: number,
		public readonly name: string,
		public readonly parentPropertyName: string|undefined,
		public readonly children: SyntaxTreeNodeViewModel[]
	) {	}

	@observable public isSelected: boolean;
	@observable public collapsed: boolean;
	@observable public isHovered: boolean;

	@computed public get isChildOrThisHovered(): boolean {
		if (this.isHovered) return true;
		return this.children.some(c => c.isChildOrThisHovered);
	}

	@computed public get isParentOrThisHovered(): boolean {
		if (this.isHovered) return true;
		if (this.parent)
			return this.parent.isParentOrThisHovered;
		return false;
	}

	@computed public get isInnerMostSelected() { return this.isSelected && this.children.length === 0; }
}

export class ViewModel implements SyntaxTreeViewFrontend {
	@observable.ref private serverModel: SyntaxTreeViewBackend|null = null;
	@observable private _root: SyntaxTreeNodeViewModel|null = null;
	@observable public _cursorPos: number = -1;

	public get root() { return this._root; }
	public get cursorPos() { return this._cursorPos; }
	@observable public hoveredNode: SyntaxTreeNodeViewModel|null = null;

	constructor() {
		autorun(() => this.root && this.updateSelected(this.root, this.cursorPos));
		autorun(() => this.markRegion());
	}

	private updateSelected(m: SyntaxTreeNodeViewModel, cursorPos: number) {
		m.isSelected = m.startPos <= cursorPos && cursorPos <= m.endPos;
		for (var c of m.children) this.updateSelected(c, cursorPos);
	}

	private markRegion() {
		if (!this.serverModel) return;

		if (this.hoveredNode)
			this.serverModel.setMarkedRegion(this.hoveredNode.startPos, this.hoveredNode.endPos);
		else
			this.serverModel.clearMarkedRegion();
	}

	private createModel(root: SyntaxTreeNode): SyntaxTreeNodeViewModel {
		const children: SyntaxTreeNodeViewModel[] = root.children.map(c => this.createModel(c));
		const model = new SyntaxTreeNodeViewModel(this, root.startPos, root.endPos, root.name, root.parentPropertyName, children);
		for (const c of children)
			c.parent = model;
		return model;
	}
	
	public setServerModel(serverModel: SyntaxTreeViewBackend|null) {
		this.serverModel = serverModel;
	}

	public async setCursorPos(pos: number): Promise<void> {
		this._cursorPos = pos;
	}

	public setSubTree(path: number[], tree: SyntaxTreeNode): Promise<void> {
		this._root = this.createModel(tree);
		return Promise.resolve();
	}

	public resetTree(): Promise<void> {
		this._root = null;
		return Promise.resolve();
	}
}