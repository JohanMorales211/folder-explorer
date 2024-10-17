export const parseGitignore = (content: string): string[] => {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
};

export const isPathIgnored = (
  path: string,
  ignorePatterns: string[]
): boolean => {
  const pathSegments = path.split("/");

  return ignorePatterns.some((pattern) => {
    if (pattern.endsWith("/")) {
      const folderName = pattern.slice(0, -1);
      return pathSegments.includes(folderName);
    } else {
      return pathSegments.includes(pattern);
    }
  });
};
