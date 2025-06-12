import { Component } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { FolderProcessorService, TreeNode } from './services/folder-processor.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [
    trigger('fadeSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('resultsContainer', [
       transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('400ms 100ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ])
  ]
})
export class AppComponent {
  treeData: TreeNode | null = null;
  folderStructureText = '';
  isLoading = false;
  progress: number | null = null;
  error: string | null = null;
  selectedFolderName: SafeHtml | string = '';

  title = 'folder-explorer'; 

  constructor(
    private folderProcessor: FolderProcessorService,
    private sanitizer: DomSanitizer
  ) {}

  onFolderSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const files = inputElement.files;
    if (!files || files.length === 0) { return; }
    this.isLoading = true;
    this.error = null;
    this.treeData = null;
    this.progress = 0;
    const rootPath = (files[0] as any).webkitRelativePath;
    const folderName = rootPath ? rootPath.split('/')[0] : 'archivos';
    this.selectedFolderName = this.sanitizer.bypassSecurityTrustHtml(`Carpeta seleccionada: <strong>${folderName}</strong>`);
    this.folderProcessor.processFolder(files).subscribe({
      next: (e) => {
        if (e.type === 'progress') this.progress = e.value;
        else if (e.type === 'complete') {
          this.treeData = e.tree;
          this.folderStructureText = e.structureText;
          this.downloadTextFile(e.structureText, `estructura_${e.tree.name}.txt`);
        } else if (e.type === 'error') this.error = e.message;
      },
      error: () => { this.error = 'Ocurrió un error inesperado.'; this.isLoading = false; },
      complete: () => { this.isLoading = false; this.progress = null; }
    });
  }

  downloadTextFile(content: string, fileName: string): void {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  resetState(): void {
    this.selectedFolderName = '';
    this.treeData = null;
    this.error = null;
    this.isLoading = false;
    this.progress = null;
  }
}