import React, { useState, ChangeEvent } from "react";
import {
  FolderTree,
  Download,
  AlertCircle,
  CheckCircle,
  Sun,
  Moon,
} from "lucide-react";
import useTheme from "./useTheme";
import { parseGitignore, isPathIgnored } from "./utils";

interface TreeNode {
  name: string;
  type: "folder" | "file";
  children?: TreeNode[];
}

function App() {
  const [folderStructure, setFolderStructure] = useState<string>("");
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const { isDarkMode, toggleTheme } = useTheme();

  const handleFolderSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsLoading(true);
      setError("");
      try {
        const { tree, structure, treeNodes } = await listFolderContents(files);
        setFolderStructure(structure);
        setTreeData(treeNodes);
        downloadTextFile(structure, "folder_structure.txt");
      } catch (err) {
        setError("Ocurrió un error al procesar los archivos.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const listFolderContents = async (
    fileList: FileList
  ): Promise<{ tree: string; structure: string; treeNodes: TreeNode[] }> => {
    let treeStructure = "Folder Structure:\n\n";
    let fileContents = "\n\nFile Contents:\n";
    const files = Array.from(fileList);

    // Buscar el archivo .gitignore
    const gitignoreFile = files.find((file) => file.name === ".gitignore");
    let ignorePatterns: string[] = [];

    if (gitignoreFile) {
      try {
        const gitignoreContent = await readFileContent(gitignoreFile);
        ignorePatterns = parseGitignore(gitignoreContent);
      } catch (error) {
        console.error("Error al leer .gitignore:", error);
      }
    }

    // Filtrar los archivos según .gitignore
    const filteredFiles = files.filter((file) => {
      const relativePath = file.webkitRelativePath || file.name;
      // Omitir el propio .gitignore si lo deseas
      if (relativePath === ".gitignore") return false;
      return !isPathIgnored(relativePath, ignorePatterns);
    });

    if (filteredFiles.length === 0) {
      return { tree: treeStructure, structure: fileContents, treeNodes: [] };
    }

    const rootPath = filteredFiles[0].webkitRelativePath.split("/")[0];

    const root: TreeNode = {
      name: rootPath,
      type: "folder",
      children: [],
    };

    const addToTree = async (path: string[], file: File) => {
      let currentNode = root;

      for (let i = 0; i < path.length; i++) {
        const part = path[i];
        let child = currentNode.children?.find(
          (c) => c.name === part && c.type === "folder"
        );

        if (!child) {
          child = {
            name: part,
            type: "folder",
            children: [],
          };
          currentNode.children?.push(child);
        }

        currentNode = child;
      }

      const fileName = file.name;
      const fileNode: TreeNode = {
        name: fileName,
        type: "file",
      };

      currentNode.children?.push(fileNode);
    };

    root.children = [];

    for (const file of filteredFiles) {
      const relativePath = file.webkitRelativePath || file.name;
      const parts = relativePath.split("/").filter(Boolean);
      if (parts.length > 1) {
        const folderPath = parts.slice(1, -1);
        await addToTree(folderPath, file);
      } else {
        await addToTree([], file);
      }
    }

    const generateTreeText = (node: TreeNode, prefix: string = ""): string => {
      let treeStr = "";

      const displayName = node.type === "folder" ? `${node.name}/` : node.name;
      treeStr += `${prefix}${displayName}\n`;

      if (node.children && node.children.length > 0) {
        node.children.forEach((child, index) => {
          const isLast = index === node.children!.length - 1;
          const connector = isLast ? "└─ " : "├─ ";
          const newPrefix = prefix + (isLast ? "    " : "│   ");
          const childDisplayName =
            child.type === "folder" ? `${child.name}/` : child.name;
          treeStr += `${prefix}${connector}${childDisplayName}\n`;
          if (child.type === "folder" && child.children) {
            treeStr += generateTreeText(child, newPrefix);
          }
        });
      }

      return treeStr;
    };

    treeStructure += generateTreeText(root);

    // Generar treeNodes para la visualización (opcional)
    const generateTreeNodes = (node: TreeNode): TreeNode[] => {
      if (!node.children) return [];

      return node.children.map((child) => ({
        ...child,
        children:
          child.type === "folder" ? generateTreeNodes(child) : undefined,
      }));
    };

    const treeNodes = generateTreeNodes(root);

    for (const file of filteredFiles) {
      const relativePath = file.webkitRelativePath || file.name;
      const fileExtension = relativePath.split(".").pop()?.toLowerCase();

      const isTextFile = [
        "txt",
        "js",
        "jsx",
        "ts",
        "tsx",
        "css",
        "html",
        "json",
        "md",
        "py",
      ].includes(fileExtension || "");

      fileContents += `\nFile: ${relativePath}\n`;
      fileContents += `${"=".repeat(relativePath.length + 6)}\n`;

      if (isTextFile) {
        try {
          const content = await readFileContent(file);
          fileContents += `${content}\n\n`;
        } catch (readError) {
          fileContents += "Error al leer el contenido del archivo.\n\n";
        }
      } else {
        fileContents += "Contenido binario o no legible.\n\n";
      }
    }

    const fullStructure = treeStructure + fileContents;

    return { tree: treeStructure, structure: fullStructure, treeNodes };
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          const content = event.target.result as string;
          resolve(content);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  const downloadTextFile = (content: string, fileName: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500 ${
        isDarkMode ? "bg-gray-900" : "bg-gray-100"
      }`}
    >
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center justify-between mb-6">
          <h1
            className={`text-4xl font-extrabold text-center transition-colors duration-500 ${
              isDarkMode ? "text-white" : "text-gray-800"
            }`}
          >
            📁 Explorador de Carpetas
          </h1>
          <p
            className={`mt-2 text-center text-lg transition-colors duration-500 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Analiza y visualiza la estructura de tus carpetas de manera
            sencilla.
          </p>
          <button
            onClick={toggleTheme}
            className="mt-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-800" />
            )}
          </button>
        </div>

        <div
          className={`p-8 rounded-lg shadow-md transition-colors duration-500 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <label
            htmlFor="folder-input"
            className="flex items-center justify-center w-full px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors duration-300"
          >
            <FolderTree className="mr-2" />
            Seleccionar Carpeta
          </label>
          <input
            id="folder-input"
            type="file"
            webkitdirectory="true"
            directory=""
            className="hidden"
            onChange={handleFolderSelect}
          />

          {isLoading && (
            <div className="flex items-center mt-6">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                ></path>
              </svg>
              <span
                className={`transition-colors duration-500 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Procesando...
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center mt-6 text-red-600">
              <AlertCircle className="mr-2 w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {folderStructure && !isLoading && !error && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className={`text-2xl font-semibold transition-colors duration-500 ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  Estructura de la Carpeta
                </h2>
                <button
                  onClick={() =>
                    downloadTextFile(folderStructure, "folder_structure.txt")
                  }
                  className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-300"
                >
                  <Download className="mr-2 w-5 h-5" />
                  Descargar
                </button>
              </div>
              <div
                className={`p-4 rounded-md shadow-inner overflow-x-auto mb-6 transition-colors duration-500 ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-50"
                }`}
              >
                <pre
                  className={`whitespace-pre-wrap font-mono text-sm transition-colors duration-500 ${
                    isDarkMode ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {folderStructure}
                </pre>
              </div>

              <div className="flex items-center mt-4 text-green-600">
                <CheckCircle className="mr-2 w-5 h-5" />
                <span>¡Estructura generada y descargada exitosamente!</span>
              </div>
            </div>
          )}
        </div>

        <div
          className={`mt-8 p-4 rounded-lg shadow-md flex items-center justify-center transition-colors duration-500 ${
            isDarkMode ? "bg-black" : "bg-white"
          }`}
        >
          <span
            className={`text-sm font-medium ${
              isDarkMode ? "text-white" : "text-gray-800"
            }`}
          >
            Creado por{" "}
            <a
              href="https://github.com/JohanMorales211"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Johan Morales
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
