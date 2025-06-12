function patternToRegex(pattern: string): RegExp {
  const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const regexString = escapedPattern
    .replace(/\/\*\*$/, '/.*')
    .replace(/\*\*\//g, '(.*/)?')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${regexString}$`);
}

export function parseGitignore(content: string): RegExp[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(patternToRegex);
}

export function isPathIgnored(path: string, patterns: RegExp[]): boolean {
  return patterns.some(regex => regex.test(path));
}