export interface GitignoreRule {
  regex: RegExp;
  isNegated: boolean;
  originalPattern: string;
}

function patternToRegexString(pattern: string): string {
  let regexString = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

  regexString = regexString
    .replace(/\\\*\\\*\//g, '(.*/)?')
    .replace(/\\\*\\\*/g, '.*')
    .replace(/\\\*/g, '[^/]*');

  if (!pattern.startsWith('/') && !pattern.includes('/')) {
    regexString = `(^|.*/)${regexString}`;
  }

  if (regexString.startsWith('/')) {
    regexString = regexString.substring(1);
  }
  
  if (pattern.endsWith('/')) {
    return `^${regexString}(/.*)?$`;
  }

  return `^${regexString}(/.*)?$`;
}

export function parseGitignore(content: string): GitignoreRule[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const isNegated = line.startsWith('!');
      const pattern = isNegated ? line.substring(1).trim() : line;
      
      try {
        const regex = new RegExp(patternToRegexString(pattern));
        return { regex, isNegated, originalPattern: pattern };
      } catch (e) {
        console.warn(`Patrón de .gitignore inválido, será ignorado: "${pattern}"`, e);
        return null;
      }
    })
    .filter((rule): rule is GitignoreRule => rule !== null);
}

export function applyGitignoreRules(path: string, rules: GitignoreRule[], currentDecision: boolean): boolean {
  let decision = currentDecision;
  for (const rule of rules) {
    if (rule.regex.test(path)) {
      decision = !rule.isNegated;
    }
  }
  return decision;
}