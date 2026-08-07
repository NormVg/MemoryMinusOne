export interface ExtractedFact {
  subject: string;
  predicate: string;
  object: string;
}

/**
 * Very naive heuristic-based fact extractor for the local-first benchmark.
 * In a real production system, this would be backed by an LLM (e.g. gemma4:31b).
 */
export function extractFactsFromText(text: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const lines = text.split(/[.\n]/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Pattern 1: "I am [object]" or "I was [object]"
    const iAmMatch = trimmed.match(/\bI (am|was) (.+)/i);
    if (iAmMatch) {
      facts.push({ subject: "user", predicate: iAmMatch[1].toLowerCase(), object: iAmMatch[2].trim() });
      continue;
    }

    // Pattern 2: "My [subject] is [object]" or "My [subject] was [object]"
    const myIsMatch = trimmed.match(/\bMy (.+?) (is|was) (.+)/i);
    if (myIsMatch) {
      facts.push({ subject: "user's " + myIsMatch[1].trim().toLowerCase(), predicate: myIsMatch[2].toLowerCase(), object: myIsMatch[3].trim() });
      continue;
    }

    // Pattern 3: "I [verb] [object]" (simple heuristic for common verbs like like, love, hate, want, need, have)
    const iVerbMatch = trimmed.match(/\bI (like|love|hate|want|need|have|live in|moved to|work at) (.+)/i);
    if (iVerbMatch) {
      facts.push({ subject: "user", predicate: iVerbMatch[1].toLowerCase(), object: iVerbMatch[2].trim() });
      continue;
    }
  }

  return facts;
}
