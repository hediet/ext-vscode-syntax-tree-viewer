import * as vscode from 'vscode';
import { TextDocumentContentProvider } from "./ContentProvider";

export function activate(context: vscode.ExtensionContext) {

    let provider = new TextDocumentContentProvider();
    let registration = vscode.workspace.registerTextDocumentContentProvider(TextDocumentContentProvider.previewUri.scheme, provider);

    let activeDocument: vscode.Uri|null = null;
    let cursorOffset: number|null = null;

    vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor) => {
        if (e && e.document.uri.toString() !== TextDocumentContentProvider.previewUri.toString()) {
            activeDocument = e.document.uri;
            provider.update(activeDocument, cursorOffset);
        }
    });
    
    vscode.workspace.onDidOpenTextDocument((e: vscode.TextDocument) => {
        if (e && e.uri.toString() == activeDocument.toString()) {
            provider.update(activeDocument, cursorOffset);
        }
    });

    vscode.window.onDidChangeTextEditorOptions((e: vscode.TextEditorOptionsChangeEvent) => {
        if (e.textEditor.document.uri.toString() === activeDocument.toString()) {
            provider.update(activeDocument, cursorOffset);
        }
    });

    vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (e.document.uri.toString() === activeDocument.toString()) {
            provider.update(activeDocument, cursorOffset);
        }
    });

    vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
        if (e.textEditor.document.uri.toString() === activeDocument.toString()) {
            cursorOffset = e.textEditor.document.offsetAt(e.textEditor.selection.active);
            provider.update(activeDocument, cursorOffset);
        }
    });

    context.subscriptions.push(vscode.commands.registerCommand('syntaxtree.show', () => {
        if (!activeDocument) {
            activeDocument = vscode.window.activeTextEditor.document.uri;
            provider.update(activeDocument, cursorOffset);
        }

        return vscode.commands.executeCommand('vscode.previewHtml', TextDocumentContentProvider.previewUri, vscode.ViewColumn.Two, 'Syntax Tree').then(
            (success) => {},
            (reason) => { vscode.window.showErrorMessage(reason); });
    }));

    const highlight = vscode.window.createTextEditorDecorationType({ backgroundColor: 'rgba(255, 153, 0,.55)' });

    context.subscriptions.push(vscode.commands.registerCommand('syntaxtree.revealNode', (show: boolean, start: number, end: number) => {

        const editor = vscode.window.visibleTextEditors.filter(e => e.document.uri.toString() === activeDocument.toString())[0];
        if (show) {
            const posStart = editor.document.positionAt(start);
            const posEnd = editor.document.positionAt(end);
            const range = new vscode.Range(posStart, posEnd);
            editor.revealRange(range, vscode.TextEditorRevealType.Default);
            editor.setDecorations(highlight, [range]);
        }
        else {
            editor.setDecorations(highlight, []);
        }
    }));

}

export function deactivate() {
}


