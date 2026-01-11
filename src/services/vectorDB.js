import { pipeline } from '@xenova/transformers';
import localforage from 'localforage';

class VectorDB {
  constructor(pdfId) {
    this.pdfId = pdfId;
    this.embedder = null;
    this.chunks = [];
    this.embeddings = [];
    this.storageKey = `vectordb_${pdfId}`;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize the embedding model (using a small, efficient model)
      this.embedder = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );

      // Try to load existing data from storage
      await this.loadFromStorage();
      
      this.initialized = true;
      console.log('VectorDB initialized for PDF:', this.pdfId);
    } catch (error) {
      console.error('Error initializing VectorDB:', error);
      throw error;
    }
  }

  // Split text into chunks with overlap
  chunkText(text, chunkSize = 500, overlap = 50) {
    const words = text.split(/\s+/);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }

  // Process and store PDF pages
  async addPages(pages) {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log(`Processing ${pages.length} pages...`);
    
    // Clear existing data
    this.chunks = [];
    this.embeddings = [];

    // Process each page
    for (const page of pages) {
      const pageText = page.text;
      const pageNumber = page.page;
      
      // Chunk the page text
      const pageChunks = this.chunkText(pageText);
      
      // Create chunk objects with metadata
      for (let i = 0; i < pageChunks.length; i++) {
        this.chunks.push({
          text: pageChunks[i],
          pageNumber: pageNumber,
          chunkIndex: i,
          id: `page_${pageNumber}_chunk_${i}`
        });
      }
    }

    console.log(`Created ${this.chunks.length} chunks`);

    // Generate embeddings for all chunks
    await this.generateEmbeddings();
    
    // Save to storage
    await this.saveToStorage();
    
    return this.chunks.length;
  }

  // Generate embeddings for all chunks
  async generateEmbeddings() {
    console.log('Generating embeddings...');
    this.embeddings = [];

    // Process in batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < this.chunks.length; i += batchSize) {
      const batch = this.chunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.text);
      
      // Generate embeddings
      const output = await this.embedder(texts, { pooling: 'mean', normalize: true });
      
      // Convert to regular arrays
      for (let j = 0; j < output.length; j++) {
        this.embeddings.push(Array.from(output[j].data));
      }
      
      console.log(`Processed ${Math.min(i + batchSize, this.chunks.length)}/${this.chunks.length} chunks`);
    }
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Search for relevant chunks using vector similarity
  async search(query, topK = 5) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.chunks.length === 0) {
      return [];
    }

    // Generate embedding for the query
    const queryOutput = await this.embedder(query, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(queryOutput.data);

    // Calculate similarities
    const similarities = this.embeddings.map((embedding, index) => ({
      chunk: this.chunks[index],
      similarity: this.cosineSimilarity(queryEmbedding, embedding)
    }));

    // Sort by similarity and return top K
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    return similarities.slice(0, topK);
  }

  // Save to local storage
  async saveToStorage() {
    try {
      await localforage.setItem(this.storageKey, {
        chunks: this.chunks,
        embeddings: this.embeddings,
        pdfId: this.pdfId
      });
      console.log('VectorDB saved to storage');
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  }

  // Load from local storage
  async loadFromStorage() {
    try {
      const data = await localforage.getItem(this.storageKey);
      if (data) {
        this.chunks = data.chunks || [];
        this.embeddings = data.embeddings || [];
        console.log(`Loaded ${this.chunks.length} chunks from storage`);
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
  }

  // Clear all data
  async clear() {
    this.chunks = [];
    this.embeddings = [];
    await localforage.removeItem(this.storageKey);
  }

  // Get statistics
  getStats() {
    return {
      totalChunks: this.chunks.length,
      totalEmbeddings: this.embeddings.length,
      initialized: this.initialized
    };
  }
}

export default VectorDB;
