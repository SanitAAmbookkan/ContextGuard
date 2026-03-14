const { pipeline } = require('@xenova/transformers');

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
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function runTests() {
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  
  const task = "Bellman-Ford Algorithm";
  
  const tests = [
    "Bellman-Ford Algorithm Explained",
    "Graph Algorithms Tutorial by FreeCodeCamp",
    "Shortest Path Algorithm Lecture",
    "Dijkstra vs Bellman Ford",
    "Funny Cat Videos Compilation",
    "Elden Ring Gameplay Stream",
    "Top 10 Pop Songs 2026",
    "How to bake a cake",
    "MrBeast latest challenge"
  ];
  
  console.log(`Task: "${task}"\n`);
  
  const outputTask = await embedder(task, { pooling: 'mean', normalize: true });
  const vecTask = Array.from(outputTask.data);
  
  for (const title of tests) {
    const outputTab = await embedder(title, { pooling: 'mean', normalize: true });
    const vecTab = Array.from(outputTab.data);
    const score = cosineSimilarity(vecTask, vecTab);
    console.log(`[${score.toFixed(3)}] - ${title}`);
  }
}

runTests();
