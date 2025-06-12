import { Component, Input } from '@angular/core';
import { TreeNode } from '../../services/folder-processor.service';

@Component({
  selector: 'app-folder-tree-view',
  templateUrl: './folder-tree-view.component.html',
  styleUrls: ['./folder-tree-view.component.css']
})
export class FolderTreeViewComponent {
  @Input() node!: TreeNode;
  isExpanded = true;

  toggleExpand(): void {
    if (this.node.type === 'folder') {
      this.isExpanded = !this.isExpanded;
    }
  }
}