export interface TreeNode {
  name: string;
  type: "folder" | "file";
  children?: TreeNode[];
  content?: string;
}
