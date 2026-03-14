const { pipeline } = require('@xenova/transformers');

let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

// Compute cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return isNaN(similarity) ? 0 : similarity;
}

// Basic Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
}

const AI_LOGIC_VERSION = "v2.1"; // Update this to invalidate cache
const cache = new Map();

async function analyzeDistraction(taskDescription, tabContent) {
  try {
    console.log(`\n[AI] --- New Analysis Request ---`);
    console.log(`[AI] Task: "${taskDescription.substring(0, 60)}..."`);
    console.log(`[AI] Content: "${tabContent.substring(0, 100)}..."`);

    const cacheKey = `${AI_LOGIC_VERSION}|${taskDescription}|${tabContent}`;
    if (cache.has(cacheKey)) {
      const cachedResult = cache.get(cacheKey);
      console.log(`[AI] Cache Hit! Score: ${cachedResult.similarity_score.toFixed(4)}, Action: ${cachedResult.action.toUpperCase()}`);
      return cachedResult;
    }

    // --- KEYWORD FAST-PASS (FUZZY) ---
    const taskWords = taskDescription.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 3);
    const contentLower = tabContent.toLowerCase();
    const contentWords = contentLower.replace(/[^a-z0-9 ]/g, '').split(/\s+/);
    
    let matchedCount = 0;
    taskWords.forEach(tWord => {
      // Check for direct substring or fuzzy match within content words
      const isMatched = contentWords.some(cWord => {
        if (cWord.includes(tWord) || tWord.includes(cWord)) return true;
        if (levenshtein(tWord, cWord) <= 2) return true; // Typo tolerance
        return false;
      });
      if (isMatched) matchedCount++;
    });
    
    // If > 50% of important task words match fuzzily, allow instantly
    if (taskWords.length > 0 && (matchedCount / taskWords.length) >= 0.5) {
      console.log(`[AI] Fuzzy Fast-Pass! Matched ${matchedCount}/${taskWords.length} terms.`);
      return { similarity_score: 0.98, action: 'allow', method: 'fuzzy-keyword' };
    }

    
    const fn = await getEmbedder();
    
    const outputTask = await fn(taskDescription, { pooling: 'mean', normalize: true });
    const outputTab = await fn(tabContent, { pooling: 'mean', normalize: true });
    
    const vecTask = Array.from(outputTask.data);
    const vecTab = Array.from(outputTab.data);
    
    const similarity_score = cosineSimilarity(vecTask, vecTab);
    
    // Tri-Level Scoring Logic (PRD Values)
    let action = 'block'; 
    if (similarity_score >= 0.60) {
      action = 'allow';
    } else if (similarity_score >= 0.30 && similarity_score < 0.60) {
      action = 'warn';
    } else {
      action = 'block';
    }
    
    const result = { similarity_score, action };
    console.log(`[AI] Computed Score: ${similarity_score.toFixed(4)} -> Action: ${action.toUpperCase()}`);
    
    cache.set(cacheKey, result);
    if (cache.size > 1000) cache.delete(cache.keys().next().value);
    
    return result;
  } catch (err) {
    console.error(`[AI] CRITICAL ERROR:`, err.message);
    // Safety fallback: better to allow than to block the user's browser randomly
    return { similarity_score: 0.5, action: 'allow', error: true };
  }
}

module.exports = { analyzeDistraction };
