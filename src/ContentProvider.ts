import * as vscode from 'vscode';
import { TypeScriptSyntaxTreeProvider, SyntaxTreeNode } from "./TypeScriptSyntaxTreeProvider";

export class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {

    public static previewUri = vscode.Uri.parse('syntax-tree-visualization://authority');

    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private rootNode: SyntaxTreeNode;
    private cursorOffset: number|null;

    public provideTextDocumentContent(uri: vscode.Uri): string {
        return this.provideMainTextDocumentContent();
    }

    private provideMainTextDocumentContent(): string {
        return `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Syntax Tree</title>
            </head>
            <body>
            <script type="text/javascript">
                var syntaxTreeData = ${JSON.stringify(this.rootNode)}; 
                var cursorOffset = ${JSON.stringify(this.cursorOffset)};
            </script>
            <script type="text/javascript" src="${__dirname + "/../../resources/dist/main.js"}"></script>
            </body>
            </html>`;
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public update(activeDocument: vscode.Uri|null, cursorOffset: number|null) {
        this.cursorOffset = cursorOffset;
        var p = new TypeScriptSyntaxTreeProvider();
        
        p.getRootNode(activeDocument).then(result => {

            this.rootNode = result;
            this._onDidChange.fire(TextDocumentContentProvider.previewUri);

        }, error => {});
    }
}