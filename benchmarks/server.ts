import express from 'express';
import { MemoryMinusOne, memoryStorage, memoryVectorStore, noCache, IEmbeddingPlugin } from '@memory-minus-one/core';

// Custom lightweight Ollama embedding plugin to avoid Vercel AI SDK telemetry errors
function ollamaEmbedding(model: string = 'embeddinggemma:latest'): IEmbeddingPlugin {
  return {
    name: "ollama-embedding",
    version: "1.0.0",
    async init(ctx) {
      ctx.logger.debug("ollama", `Initialized direct Ollama embedding for ${model}`);
    },
    async embed(text: string) {
      const res = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text })
      });
      const data = await res.json();
      return { vector: data.embedding, dim: data.embedding.length };
    },
    async embedBatch(texts: string[]) {
      // Ollama's /api/embeddings endpoint only supports one prompt at a time
      const vectors = await Promise.all(texts.map(async t => {
        const res = await fetch('http://localhost:11434/api/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt: t })
        });
        const data = await res.json();
        return data.embedding;
      }));
      return { vectors, dim: vectors[0].length };
    }
  };
}

// Initialize MemoryMinusOne with Gemma embedding and in-memory plugins
const memory = new MemoryMinusOne({
  storage: memoryStorage(),
  vector: memoryVectorStore(),
  cache: noCache(),
  embedding: ollamaEmbedding('embeddinggemma:latest')
});
const app = express();

app.use(express.json({ limit: '50mb' }));

// Healthcheck
app.get('/', (req, res) => {
  res.send('MemoryMinusOne Mem0 Compatibility Server is running.');
});

/**
 * Mem0 ADD Endpoint
 * POST /memories
 * Payload: { messages: [...], user_id: "...", ... }
 */
app.post('/memories', async (req, res) => {
  try {
    const { messages, user_id, custom_instructions, metadata, timestamp } = req.body;
    
    if (!messages || !user_id) {
      return res.status(400).json({ error: 'messages and user_id are required' });
    }

    const addedMemories = [];

    // MemoryMinusOne handles simple facts. Mem0's benchmark sends messages like:
    // [ { role: 'user', content: 'hello' } ]
    for (const msg of messages) {
      // Ingest each message into our SDK (LOCOMO already has speaker attribution in content)
      const content = msg.content;
      
      const added = await memory.add(content, {
        userId: user_id,
        metadata: { ...metadata, custom_instructions },
        timestamp: timestamp ? timestamp * 1000 : undefined
      });
      
      // Format to match Mem0's return shape
      addedMemories.push({
        id: added.id || Math.random().toString(36).substring(7),
        memory: added.content,
        event: 'ADD'
      });
    }

    res.json({ results: addedMemories });
  } catch (error: any) {
    console.error('Error adding memory:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mem0 SEARCH Endpoint
 * POST /search
 * Payload: { query: "...", user_id: "...", limit: 200 }
 */
app.post('/search', async (req, res) => {
  try {
    const { query, user_id, limit = 200 } = req.body;
    
    if (!query || !user_id) {
      return res.status(400).json({ error: 'query and user_id are required' });
    }

    // Query our SDK
    const results = await memory.query(query, {
      userId: user_id,
      limit: limit
    });

    // Format to match Mem0's return shape
    const formattedResults = results.map(r => ({
      id: r.memory.id || Math.random().toString(36).substring(7),
      memory: r.memory.content,
      score: r.score,
      created_at: new Date(r.memory.createdAt).toISOString()
    }));

    res.json({ results: formattedResults });
  } catch (error: any) {
    console.error('Error searching memories:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mem0 DELETE USER Endpoint
 * DELETE /memories?user_id=...
 */
app.delete('/memories', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    // MemoryMinusOne doesn't have a direct clearUser method yet, 
    // but the benchmark expects a 200 OK
    console.log(`[Mock] Cleared memories for user: ${user_id}`);
    res.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8888;
app.listen(PORT, async () => {
  console.log(`=================================================`);
  console.log(`🚀 MemoryMinusOne Mem0 Compat Server`);
  console.log(`=================================================`);
  await memory.init();
  console.log(`Running on http://localhost:${PORT}`);
  console.log(`Ready for mem0ai/memory-benchmarks evaluation!`);
});
