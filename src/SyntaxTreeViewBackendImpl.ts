import * as vscode from 'vscode';

import { SyntaxTreeViewBackend, SyntaxTreeViewFrontend } from './interfaces';

export class SyntaxTreeViewBackendImpl implements SyntaxTreeViewBackend {
	private readonly highlight = vscode.window.createTextEditorDecorationType({ backgroundColor: 'rgba(255, 153, 0,.55)' });
	public frontend: SyntaxTreeViewFrontend|null = null;

	constructor(public readonly sourceEditorUri: vscode.Uri) {}

	private getDoc(): vscode.TextEditor|undefined {
		const editor = vscode.window.visibleTextEditors.filter(
			e => e.document.uri.toString() === this.sourceEditorUri.toString())[0];
		return editor;
	}

	public setFrontend(frontend: SyntaxTreeViewFrontend|null) {
		this.frontend = frontend;
	}

	public async clearMarkedRegion(): Promise<void> {
		const editor = this.getDoc();
		if (!editor) return;

		editor.setDecorations(this.highlight, []);
	}

	public async setMarkedRegion(startPos: number, endPos: number): Promise<void> {
		const editor = this.getDoc();
		if (!editor) return;

		const posStart = editor.document.positionAt(startPos);
		const posEnd = editor.document.positionAt(endPos);
		const range = new vscode.Range(posStart, posEnd);
		editor.revealRange(range, vscode.TextEditorRevealType.Default);
		editor.setDecorations(this.highlight, [range]);
	}
}