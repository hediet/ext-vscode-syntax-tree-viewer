import * as vscode from 'vscode';

import { SyntaxTreeViewBackendImpl } from "./SyntaxTreeViewBackendImpl";
import { TypeScriptSyntaxTreeProvider } from "./TypeScriptSyntaxTreeProvider";

export class ModelService {
	private backendImpls = new Map</* sourceUri */ string, SyntaxTreeViewBackendImpl>();

	public registerToVsCode(): vscode.Disposable {
		const disposables = [];
		disposables.push(vscode.workspace.onDidChangeTextDocument(async (e: vscode.TextDocumentChangeEvent) => {
			const model = this.backendImpls.get(e.document.uri.toString());
			if (!model) return;
			await this.updateModel(model);
		}));

		disposables.push(vscode.window.onDidChangeTextEditorSelection(async (e: vscode.TextEditorSelectionChangeEvent) => {
			const model = this.backendImpls.get(e.textEditor.document.uri.toString());
			if (!model) return;

			const cursorOffset = e.textEditor.document.offsetAt(e.textEditor.selection.active);
			if (model.frontend)
				await model.frontend.setCursorPos(cursorOffset);
		}));
		return vscode.Disposable.from(...disposables);
	}

	private async updateModel(model: SyntaxTreeViewBackendImpl): Promise<void> {
		if (!model.frontend) return;
		
		const p = new TypeScriptSyntaxTreeProvider();
		const node = await p.getRootNode(model.sourceEditorUri);
		if (!node) {
			await model.frontend.resetTree();
		}
		else {
			await model.frontend.setSubTree([], node);
		}
	}

	public addModel(model: SyntaxTreeViewBackendImpl) {
		this.backendImpls.set(model.sourceEditorUri.toString(), model);
		this.updateModel(model);
	}
}