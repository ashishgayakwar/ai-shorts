export interface Token {
  text: string;
  start: number;
  end: number;
  id: number;
  isSpace?: boolean;
  isSpecial?: boolean;
}

export type MethodKey = "char" | "word" | "bpe" | "wp";

const WORD_RE = /(\w+)|(\s+)|([^\w\s])/gu;

const BPE_MERGES: [string, string][] = [
  ["t", "h"], ["h", "e"], ["i", "n"], ["e", "r"], ["o", "u"], ["a", "n"], ["r", "e"], ["o", "n"],
  ["a", "t"], ["e", "n"], ["e", "s"], ["o", "r"], ["t", "e"], ["o", "f"], ["e", "d"], ["i", "s"],
  ["i", "t"], ["a", "l"], ["a", "r"], ["s", "t"], ["t", "o"], ["n", "t"], ["n", "g"], ["s", "e"],
  ["h", "a"], ["a", "s"], ["o", "w"], ["th", "e"], ["i", "ng"], ["i", "on"], ["ti", "on"],
  ["qu", "i"], ["qui", "ck"], ["br", "ow"], ["brow", "n"], ["j", "u"], ["ju", "m"], ["jum", "p"],
  ["jump", "s"], ["o", "v"], ["ov", "er"], ["l", "a"], ["la", "z"], ["laz", "y"], ["d", "o"],
  ["do", "g"], ["f", "o"], ["fo", "x"],
  ["T", "ok"], ["Tok", "en"], ["Token", "iz"], ["Tokeniz", "ation"], ["n", "'t"],
  ["al", "way"], ["alway", "s"], ["ob", "v"], ["obv", "ious"],
  ["Tr", "an"], ["Tran", "s"], ["Trans", "form"], ["Transform", "er"], ["Transformer", "s"],
  ["at", "ten"], ["atten", "tion"], ["self", "-"], ["self-", "atten"],
  ["mult", "i"], ["multi", "-"], ["multi-", "head"],
  ["em", "be"], ["embe", "d"], ["embed", "d"], ["embedd", "ing"], ["embedding", "s"],
  ["de", "f"], ["re", "turn"], ["pr", "int"], ["sp", "lit"],
  ["0", "0"], ["1", "0"], ["2", "0"], ["2", "5"], ["20", "25"], ["4", "7"], ["3", "%"],
  ["$", "1"], ["$1", "2"],
];

const WP_VOCAB = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "to", "of", "in", "on", "at", "by", "for",
  "with", "as", "and", "or", "but", "not", "this", "that", "these", "those", "what", "when",
  "where", "why", "how", "quick", "brown", "fox", "jumps", "over", "lazy", "dog", "jump",
  "always", "sometimes", "obvious", "machine", "reads", "words", "model", "text", "code",
  "data", "user", "hello", "world", "python", "def", "return", "print", "split", "revenue",
  "grew", "transformers", "use", "self", "attention", "across", "multi", "head",
  "embedding", "tokenization", "token", "tokenize", "even", "splits", "emoji", "emojis",
  ".", ",", ";", ":", "!", "?", "-", "—", "(", ")", '"', "'", "/", "%", "$", "#", "@", "&",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "##s", "##es", "##ed", "##ing", "##er", "##ly", "##tion", "##ation", "##ness", "##ment",
  "##able", "##ible", "##ful", "##less", "##ous", "##ive", "##al", "##ic", "##ish",
  "##'t", "##n't", "##re", "##ve", "##ll", "##d",
  "##ize", "##izer", "##izes", "##ized", "##izing",
]);

for (const c of "abcdefghijklmnopqrstuvwxyz0123456789") {
  WP_VOCAB.add(c);
  WP_VOCAB.add(`##${c}`);
}

export function charTokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let idx = 0;
  for (const ch of text) {
    tokens.push({ text: ch, start: idx, end: idx + ch.length, id: ch.codePointAt(0) ?? 0 });
    idx += ch.length;
  }
  return tokens;
}

export function wordTokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let match: RegExpExecArray | null;
  const vocab = new Map<string, number>();
  let nextId = 1;

  while ((match = WORD_RE.exec(text)) !== null) {
    const value = match[0];
    if (!vocab.has(value)) {
      vocab.set(value, nextId++);
    }
    tokens.push({
      text: value,
      start: match.index,
      end: match.index + value.length,
      id: vocab.get(value) ?? 0,
      isSpace: /^\s+$/u.test(value),
    });
  }

  return tokens;
}

export function bpeTokenize(text: string): Token[] {
  if (!text) return [];

  const tokens: Token[] = [];
  const chunks = text.match(/\s+|\S+/gu) ?? [];
  const pieceToId = new Map<string, number>();
  let nextId = 256;
  let pos = 0;

  const getId = (piece: string) => {
    if (!pieceToId.has(piece)) {
      pieceToId.set(piece, nextId++);
    }
    return pieceToId.get(piece) ?? 0;
  };

  for (const chunk of chunks) {
    if (/^\s+$/u.test(chunk)) {
      if (chunk.includes("\n") || chunk.includes("\t")) {
        for (const c of chunk) {
          const display = c === "\n" ? "\\n" : c === "\t" ? "\\t" : "Ġ";
          tokens.push({
            text: display,
            start: pos,
            end: pos + 1,
            id: getId(display),
            isSpecial: c === "\n" || c === "\t",
          });
          pos += 1;
        }
      } else {
        tokens.push({ text: "Ġ", start: pos, end: pos + chunk.length, id: getId("Ġ"), isSpace: true });
        pos += chunk.length;
      }
      continue;
    }

    const pieces = [...chunk];
    let changed = true;
    let guard = 0;

    while (changed && guard < 60) {
      changed = false;
      guard += 1;

      outer: for (const [a, b] of BPE_MERGES) {
        for (let i = 0; i < pieces.length - 1; i += 1) {
          if (pieces[i] === a && pieces[i + 1] === b) {
            pieces.splice(i, 2, a + b);
            changed = true;
            break outer;
          }
        }
      }
    }

    for (const piece of pieces) {
      tokens.push({ text: piece, start: pos, end: pos + piece.length, id: getId(piece) });
      pos += piece.length;
    }
  }

  return tokens;
}

export function wpTokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const vocabToId = new Map<string, number>();
  let nextId = 100;

  const getId = (piece: string) => {
    if (!vocabToId.has(piece)) {
      vocabToId.set(piece, nextId++);
    }
    return vocabToId.get(piece) ?? 0;
  };

  let match: RegExpExecArray | null;
  while ((match = WORD_RE.exec(text)) !== null) {
    const chunk = match[0];
    const start = match.index;

    if (/^\s+$/u.test(chunk)) {
      tokens.push({ text: "·", start, end: start + chunk.length, id: 0, isSpace: true });
      continue;
    }

    if (/^[^\w\s]$/u.test(chunk)) {
      tokens.push({ text: chunk, start, end: start + chunk.length, id: getId(chunk) });
      continue;
    }

    const lower = chunk.toLowerCase();
    let i = 0;
    let isStart = true;

    while (i < lower.length) {
      let found: { cand: string; len: number } | null = null;

      for (let j = lower.length; j > i; j -= 1) {
        const sub = lower.slice(i, j);
        const cand = isStart ? sub : `##${sub}`;
        if (WP_VOCAB.has(cand)) {
          found = { cand, len: j - i };
          break;
        }
      }

      if (!found) {
        const fallback = isStart ? lower[i] : `##${lower[i]}`;
        found = { cand: fallback, len: 1 };
      }

      tokens.push({
        text: found.cand,
        start: start + i,
        end: start + i + found.len,
        id: getId(found.cand),
      });

      i += found.len;
      isStart = false;
    }
  }

  return tokens;
}

export const METHODS: Array<{
  key: MethodKey;
  label: string;
  subtitle: string;
  fn: (text: string) => Token[];
}> = [
  { key: "char", label: "Character", subtitle: "one glyph at a time", fn: charTokenize },
  { key: "word", label: "Word", subtitle: "split on whitespace & punctuation", fn: wordTokenize },
  { key: "bpe", label: "BPE", subtitle: "byte-pair encoding · GPT-style", fn: bpeTokenize },
  { key: "wp", label: "WordPiece", subtitle: "BERT-style · ## marks continuations", fn: wpTokenize },
];

export function tokenizeAll(text: string) {
  return METHODS.map((method) => {
    const tokens = method.fn(text);
    const unique = new Set(tokens.map((token) => token.text)).size;
    const charsPerToken = tokens.length ? (text.length / tokens.length).toFixed(2) : "0";
    return {
      method,
      tokens,
      count: tokens.length,
      unique,
      charsPerToken,
    };
  });
}
