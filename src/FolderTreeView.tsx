import React, { useState } from "react";
import { Folder, File, ChevronRight, ChevronDown } from "lucide-react";
import { TreeNode } from "./types";

interface FolderTreeViewProps {
  node: TreeNode;
  depth?: number;
}

const FolderTreeView: React.FC<FolderTreeViewProps> = ({ node, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showContent, setShowContent] = useState<boolean>(false);

  const hasChildren =
    node.type === "folder" && node.children && node.children.length > 0;

  const toggleFolder = () => {
    if (node.type === "folder") {
      setIsOpen(!isOpen);
    }
  };

  const toggleContent = () => {
    if (node.type === "file") {
      setShowContent(!showContent);
    }
  };

  return (
    <div style={{ paddingLeft: depth * 20 }} className="folder-tree-view">
      <div
        className="flex items-center cursor-pointer"
        onClick={hasChildren ? toggleFolder : toggleContent}
      >
        {hasChildren ? (
          isOpen ? (
            <ChevronDown className="w-4 h-4 mr-1" />
          ) : (
            <ChevronRight className="w-4 h-4 mr-1" />
          )
        ) : (
          node.type === "file" && <span className="w-4 h-4 mr-1"></span> // Espacio para alinear los archivos
        )}
        {node.type === "folder" ? (
          <Folder className="w-4 h-4 mr-1" />
        ) : (
          <File className="w-4 h-4 mr-1" />
        )}
        <span>{node.name}</span>
      </div>

      {node.type === "file" && showContent && node.content && (
        <div className="mt-2 ml-6 bg-gray-100 p-2 rounded-md">
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
            {node.content}
          </pre>
        </div>
      )}

      {hasChildren && isOpen && (
        <div>
          {node.children!.map((child, index) => (
            <FolderTreeView key={index} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FolderTreeView;
