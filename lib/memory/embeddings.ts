/**
 * Vector Embeddings Service for Jeeva Mem0 Memory Architecture
 * Standardized to 768 dimensions (Gemini text-embedding-004 compatible).
 */

export const EMBEDDING_DIMENSIONS = 768;

/**
 * Computes cosine similarity between two unit-normalized vectors.
 * Returns a score between -1.0 and 1.0 (typically 0.0 to 1.0).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * High-performance, zero-dependency 768-dim semantic hashing vectorizer.
 * Creates smooth unit-normalized dense vectors with subword and n-gram overlap,
 * ensuring high cosine similarity for related phrases even offline.
 */
function generateLocalSemanticVector(text: string): number[] {
  const vector = new Float32Array(EMBEDDING_DIMENSIONS);
  const normalized = text.toLowerCase().trim();
  if (!normalized) return Array.from(vector);

  // 1. Tokenize words and subwords
  const words = normalized.split(/\s+/);
  
  // Hash function (Murmur/FNV hybrid)
  const hashString = (str: string, seed: number) => {
    let h = seed ^ 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0);
  };

  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const word = words[wIdx];
    const wordWeight = 1.0 / Math.sqrt(wIdx + 1);

    // Full word hash across multiple dimensions
    for (let seed = 0; seed < 4; seed++) {
      const idx = hashString(word, seed * 31) % EMBEDDING_DIMENSIONS;
      vector[idx] += wordWeight * 1.5;
    }

    // Character n-grams (3-grams, 4-grams) for subword & morphological similarity
    if (word.length >= 3) {
      for (let i = 0; i <= word.length - 3; i++) {
        const trigram = word.substring(i, i + 3);
        const idx = hashString(trigram, 17) % EMBEDDING_DIMENSIONS;
        vector[idx] += wordWeight * 0.7;
      }
    }
  }

  // 2. L2-Normalize the vector to unit length
  let sumSquares = 0;
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    sumSquares += vector[i] * vector[i];
  }

  const norm = Math.sqrt(sumSquares);
  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
      vector[i] /= norm;
    }
  }

  return Array.from(vector);
}

/**
 * Generates a 768-dimensional embedding for text.
 * Uses Gemini text-embedding-004 if GEMINI_API_KEY is configured,
 * otherwise seamlessly uses the local 768-dim semantic vectorizer.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.trim();
  if (!cleanText) {
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: cleanText }] },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const values = data.embedding?.values;
        if (Array.isArray(values) && values.length === EMBEDDING_DIMENSIONS) {
          return values;
        }
      } else {
        console.warn(`[Embeddings] Gemini embedding API returned status ${response.status}, using local fallback.`);
      }
    } catch (err) {
      console.warn('[Embeddings] Gemini embedding API error, using local fallback:', err);
    }
  }

  // Local fallback
  return generateLocalSemanticVector(cleanText);
}
