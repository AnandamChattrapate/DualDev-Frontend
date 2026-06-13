const KEYWORDS = {
  python: new Set([
    'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return',
    'import', 'from', 'in', 'and', 'or', 'not', 'True', 'False', 'None',
    'lambda', 'try', 'except', 'finally', 'with', 'as', 'pass', 'break',
    'continue', 'raise', 'yield', 'global', 'nonlocal', 'del', 'assert', 'is',
    'print', 'input', 'len', 'range', 'enumerate', 'zip', 'map', 'filter',
    'sorted', 'sum', 'min', 'max', 'int', 'str', 'list', 'dict', 'set',
    'tuple', 'bool', 'float', 'type', 'isinstance', 'append', 'extend',
    'split',
  ]),
  cpp: new Set([
    'int', 'long', 'float', 'double', 'char', 'bool', 'void', 'string',
    'if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue',
    'class', 'struct', 'public', 'private', 'protected', 'new', 'delete',
    'include', 'using', 'namespace', 'auto', 'const', 'true', 'false',
    'switch', 'case', 'default', 'typedef', 'template', 'typename',
    'cin', 'cout', 'endl', 'cerr',
    'vector', 'map', 'set', 'unordered_map', 'unordered_set',
    'pair', 'array', 'stack', 'queue', 'priority_queue', 'deque',
    'sort', 'min', 'max', 'swap', 'push_back', 'pop_back',
  ]),
  java: new Set([
    'int', 'long', 'float', 'double', 'char', 'boolean', 'void', 'String',
    'if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue',
    'class', 'public', 'private', 'protected', 'new', 'static', 'final',
    'import', 'package', 'this', 'super', 'extends', 'implements',
    'true', 'false', 'null', 'switch', 'case', 'default',
    'try', 'catch', 'finally', 'throw', 'throws', 'interface', 'abstract',
    'System', 'out', 'println', 'print', 'in', 'Scanner', 'nextInt',
    'nextLine', 'next', 'ArrayList', 'HashMap', 'HashSet', 'Arrays',
    'Collections', 'Math', 'Integer', 'String', 'StringBuilder',
  ]),
}

export const tokenize = (code, language) => {
  if (!code || !language) return ''

  const keywords = KEYWORDS[language] || KEYWORDS.python
  const lines = code.split('\n')

  return lines.map((line) => {
    // Split on whitespace OR punctuation, but capture everything
    const tokens = line.split(/(\s+|[{}()[\],.:;+\-*/%=<>!&|^~?#])/g).filter(t => t !== undefined && t !== '')
    
    return tokens.map((token) => {
      // whitespace — preserve exactly
      if (/^\s+$/.test(token)) return token

      // Handle string literals
      if (/^["'`]/.test(token) && /["'`]$/.test(token)) {
        return token[0] + '▓'.repeat(token.length - 2) + token[token.length - 1]
      }

      // keywords — show as-is
      if (keywords.has(token)) return token

      // numbers — replace with same length ▓
      if (/^\d+(\.\d+)?$/.test(token)) return '▓'.repeat(token.length)

      // operators and punctuation — show as-is
      if (/^[{}()[\],.:;+\-*/%=<>!&|^~?#]+$/.test(token)) return token

      // everything else (identifiers) — replace with ▓
      if (token.trim().length > 0) return '▓'.repeat(token.length)

      return token
    }).join('')
  }).join('\n')
}