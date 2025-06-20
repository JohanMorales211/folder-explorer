import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { parseGitignore, GitignoreRule, applyGitignoreRules } from '../utils/gitignore.utils';

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
          if (files.length === 0) {
              observer.next({ type: 'error', message: 'La carpeta seleccionada está vacía.' });
              observer.complete();
              return;
          }

          const rootPath = (files[0] as any).webkitRelativePath.split("/")[0];
          
          const gitignoreMap = new Map<string, GitignoreRule[]>();
          const gitignoreFiles = files.filter(file => file.name === '.gitignore');

          for (const gitignoreFile of gitignoreFiles) {
            const fullPath = (gitignoreFile as any).webkitRelativePath;
            const relativePath = fullPath.substring(rootPath.length + 1);
            const dirRelativePath = relativePath.includes('/') ? relativePath.substring(0, relativePath.lastIndexOf('/')) : '';
            const content = await this.readFileContent(gitignoreFile);
            gitignoreMap.set(dirRelativePath, parseGitignore(content));
          }

          const filteredFiles = files.filter(file => {
              const fullPath = (file as any).webkitRelativePath;
              const relativePath = fullPath.substring(rootPath.length + 1);

              if (file.name === '.gitignore' || !relativePath || (file.size === 0 && fullPath.endsWith('/'))) {
                return false;
              }
              
              return !this.isEffectivelyIgnored(relativePath, gitignoreMap);
          });

          if (filteredFiles.length === 0) {
              observer.next({ type: 'error', message: 'La carpeta está vacía o todos los archivos fueron ignorados por .gitignore.' });
              observer.complete();
              return;
          }

          const root: TreeNode = { name: rootPath, type: 'folder', path: rootPath, children: [] };
          let processedFilesCount = 0;
          
          for (const file of filteredFiles) {
              const path = (file as any).webkitRelativePath;
              const parts = path.split('/').slice(1);
              await this.addToTree(parts, file, root);
              processedFilesCount++;
              observer.next({ type: 'progress', value: (processedFilesCount / filteredFiles.length) * 100 });
          }

          this.sortTree(root);
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

  private isEffectivelyIgnored(filePath: string, gitignoreMap: Map<string, GitignoreRule[]>): boolean {
    const pathParts = filePath.split('/');
    let decision = false;
    
    const dirsToCheck: string[] = [''];
    for (let i = 0; i < pathParts.length - 1; i++) {
      dirsToCheck.push(pathParts.slice(0, i + 1).join('/'));
    }

    for (const dir of dirsToCheck) {
      const rules = gitignoreMap.get(dir);
      if (rules) {
        const pathRelativeToDir = dir === '' ? filePath : filePath.substring(dir.length + 1);
        decision = applyGitignoreRules(pathRelativeToDir, rules, decision);
      }
    }

    return decision;
  }
  
  private sortTree(node: TreeNode): void {
    if (node.children) {
        node.children.sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name);
            }
            return a.type === 'folder' ? -1 : 1;
        });
        node.children.forEach(child => {
            if (child.type === 'folder') {
                this.sortTree(child);
            }
        });
    }
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        
        const isTextFile = /text.*/.test(file.type) || /\.(txt|js|ts|html|css|json|md|py|yml|yaml|svg|xml|java|cs|php|rb|go|rs)$/.test(file.name.toLowerCase());
        
        if (isTextFile || file.name === '.gitignore') {
            reader.readAsText(file, 'UTF-8');
        } else {
            resolve("Contenido binario o no legible.");
        }
    });
  }

  private async addToTree(pathParts: string[], file: File, currentNode: TreeNode): Promise<void> {
    if (pathParts.length === 0 || pathParts[0] === '') return;

    const part = pathParts[0];

    if (pathParts.length === 1) {
      const fileNode: TreeNode = {
        name: part,
        type: 'file',
        path: (file as any).webkitRelativePath,
        content: await this.readFileContent(file)
      };
      if (!currentNode.children) currentNode.children = [];
      currentNode.children.push(fileNode);
      return;
    }

    if (!currentNode.children) currentNode.children = [];
    
    let folderNode = currentNode.children.find(child => child.name === part && child.type === 'folder');
    
    if (!folderNode) {
      const currentPath = (file as any).webkitRelativePath.substring(0, (file as any).webkitRelativePath.indexOf(pathParts.slice(1).join('/')) - 1);
      folderNode = { name: part, type: 'folder', path: currentPath, children: [] };
      currentNode.children.push(folderNode);
    }
    
    await this.addToTree(pathParts.slice(1), file, folderNode);
  }
  
  private generateFullStructureText(root: TreeNode): string {
    let output = "Estructura de la carpeta:\n";
    output += this.generateTreeText(root);
    output += "\n\nContenido de los archivos:\n==========================\n";

    const fileContents = this.collectFileContents(root);
    output += fileContents.trim();

    return output;
  }

  private generateTreeText(node: TreeNode, prefix = "", isRoot = true): string {
      let result = isRoot ? node.name + '/\n' : prefix + "└─ " + node.name + (node.type === 'folder' ? '/' : '') + '\n';
      
      if (node.children) {
          node.children.forEach((child, index) => {
              const isLast = index === node.children!.length - 1;
              const newPrefix = prefix + (isRoot ? "" : (isLast ? "    " : "│   "));
              result += this.generateTreeText(child, newPrefix, false);
          });
      }
      return result;
  }

  private collectFileContents(node: TreeNode): string {
    let result = '';
    
    if (node.type === 'file' && node.path) {
      result += `\nArchivo: ${node.path}\n`;
      result += `${"=".repeat(node.path.length + 9)}\n`;
      result += `${node.content || 'Contenido no disponible.'}\n\n`;
    }

    if (node.children) {
      const sortedChildren = [...node.children].sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });

      for (const child of sortedChildren) {
        result += this.collectFileContents(child);
      }
    }
    return result;
  }
}