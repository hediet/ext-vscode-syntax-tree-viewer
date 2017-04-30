import * as vscode from "vscode";
import * as ts from "typescript";

import { SyntaxTreeNode } from "./interfaces";

export interface SyntaxTreeProvider {
	getRootNode(documentUri: vscode.Uri): PromiseLike<SyntaxTreeNode|null>;
}

export class TypeScriptSyntaxTreeProvider implements SyntaxTreeProvider {
	private findKey(value: any, object: any): string|null {
		for (var key in object) {
			if (key.startsWith("_")) continue;

			var member = object[key];
			if (member === value)
				return key;

			if (Array.isArray(member) && member.indexOf(value) !== -1)
				return key;
		}

		return null;
	}

	private toTreeNode(node: ts.Node, memberName: string): SyntaxTreeNode {

		const name = ts.SyntaxKind[node.kind];

		const children = node.getChildren().map((childNode, idx) => {
			let parentPropertyName = this.findKey(childNode, node) || "";

			if (childNode.kind == ts.SyntaxKind.SyntaxList) {
				childNode.getChildren().some(c => {
					parentPropertyName = this.findKey(c, node) || "";
					return !!parentPropertyName;
				});

				if (childNode.getChildren().length === 0) return null!;
			}

			if (node.kind == ts.SyntaxKind.SyntaxList) {
				parentPropertyName = "" + idx;
			}

			return this.toTreeNode(childNode, parentPropertyName);
		}).filter(c => c !== null);

		const result = {
			name: name,
			parentPropertyName: memberName,
			children: children,
			startPos: node.pos,
			endPos: node.end
		};

		return result;
	}

	public getRootNode(documentUri: vscode.Uri): PromiseLike<SyntaxTreeNode|null> {

		const idToKind = {
			"typescript": ts.ScriptKind.TS,
			"typescriptreact": ts.ScriptKind.TSX,
			"javascript": ts.ScriptKind.JS,
			"javascriptreact": ts.ScriptKind.JSX
		} as { [key: string]: ts.ScriptKind };

		return vscode.workspace.openTextDocument(documentUri).then(doc => {
			if (idToKind[doc.languageId]) {
				const src = doc.getText();
				const sf = ts.createSourceFile("main.ts", src, ts.ScriptTarget.ES5, true, idToKind[doc.languageId]);
				return this.toTreeNode(sf, "root");
			}

			return null;

		}, (errorReason) => {});
	}
}