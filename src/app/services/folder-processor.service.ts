import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { isPathIgnored, parseGitignore } from '../utils/gitignore.utils';

export interface TreeNode {
  name: string;
  type: 'folder' | 'file';
  path: string;
  children?: TreeNode[];
  content?: string;
}

export type ProcessEvent =
  | { type: 'progress'; value: number }
  | { type: 'error'; message: string }
  | { type: 'complete'; tree: TreeNode; structureText: string };

@Injectable({
  providedIn: 'root'
})
export class FolderProcessorService {

  constructor() { }

  processFolder(fileList: FileList): Observable<ProcessEvent> {
    return new Observable(observer => {
      const process = async () => {
        try {
          const files = Array.from(fileList);
          const totalFiles = files.length;
          let processedFiles = 0;

          const gitignoreFile = files.find((file) => file.name === ".gitignore");
          let ignorePatterns: RegExp[] = [];
          if (gitignoreFile) {
            const gitignoreContent = await this.readFileContent(gitignoreFile);
            ignorePatterns = parseGitignore(gitignoreContent);
          }

          const filteredFiles = files.filter(file => {
              const relativePath = (file as any).webkitRelativePath || file.name;
              if (relativePath.endsWith('/.gitignore')) return false;
              return !isPathIgnored(relativePath, ignorePatterns);
          });

          if (filteredFiles.length === 0) {
              observer.next({ type: 'error', message: 'La carpeta está vacía o todos los archivos fueron ignorados.' });
              observer.complete();
              return;
          }

          const rootPath = (filteredFiles[0] as any).webkitRelativePath.split("/")[0];
          const root: TreeNode = { name: rootPath, type: 'folder', path: rootPath, children: [] };
          
          for (const file of filteredFiles) {
              const path = (file as any).webkitRelativePath;
              const parts = path.split('/').slice(1);
              await this.addToTree(parts, file, root);
              processedFiles++;
              observer.next({ type: 'progress', value: (processedFiles / totalFiles) * 100 });
          }

          const structureText = this.generateFullStructureText(root);
          
          observer.next({ type: 'complete', tree: root, structureText });
          observer.complete();

        } catch (e) {
            console.error("Error en FolderProcessorService:", e);
            observer.next({ type: 'error', message: 'Ocurrió un error al procesar la carpeta.' });
            observer.complete();
        }
      };

      process();
    });
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        
        const isTextFile = /text.*/.test(file.type) || /\.(txt|js|ts|html|css|json|md|py|yml|yaml|svg|xml|java|cs|php|rb|go|rs)$/.test(file.name.toLowerCase());
        
        if (isTextFile) {
            reader.readAsText(file, 'UTF-8');
        } else {
            resolve("Contenido binario o no legible.");
        }
    });
  }

  private async addToTree(pathParts: string[], file: File, currentNode: TreeNode): Promise<void> {
    if (pathParts.length === 0) return;

    const part = pathParts[0];

    if (pathParts.length === 1) {
      const fileNode: TreeNode = {
        name: part,
        type: 'file',
        path: (file as any).webkitRelativePath,
        content: await this.readFileContent(file)
      };
      if (!currentNode.children) {
        currentNode.children = [];
      }
      currentNode.children.push(fileNode);
      return;
    }

    if (!currentNode.children) {
      currentNode.children = [];
    }
    
    let folderNode = currentNode.children.find(child => child.name === part && child.type === 'folder');
    
    if (!folderNode) {
      folderNode = { name: part, type: 'folder', path: '', children: [] };
      currentNode.children.push(folderNode);
    }
    
    await this.addToTree(pathParts.slice(1), file, folderNode);
  }
  
  private generateFullStructureText(root: TreeNode): string {
    let output = "Estructura de la carpeta:\n";
    output += this.generateTreeText(root);
    output += "\n\nContenido de los archivos:\n==========================\n";

    const fileContents = this.collectFileContents(root);
    output += fileContents;

    return output;
  }

  private generateTreeText(node: TreeNode, prefix = ""): string {
      let result = prefix + (prefix ? "└─ " : "") + node.name + (node.type === 'folder' ? '/' : '') + '\n';
      if (node.children) {
          node.children.forEach((child, index) => {
              const isLast = index === node.children!.length - 1;
              const newPrefix = prefix + (isLast ? "    " : "│   ");
              result += this.generateTreeText(child, newPrefix);
          });
      }
      return result;
  }

  private collectFileContents(node: TreeNode): string {
    let result = '';
    if (node.type === 'file') {
      result += `\nArchivo: ${node.path}\n`;
      result += `${"=".repeat(node.path.length + 9)}\n`;
      result += `${node.content || 'Contenido no disponible.'}\n\n`;
    }
    if (node.children) {
      for (const child of node.children) {
        result += this.collectFileContents(child);
      }
    }
    return result;
  }
}