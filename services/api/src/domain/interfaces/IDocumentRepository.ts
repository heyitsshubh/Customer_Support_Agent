import { KnowledgeDocument } from '../entities/Document.js';

export interface DocumentSearchResult {
  document: KnowledgeDocument;
  similarityScore: number;
}

export interface IDocumentRepository {
  findById(id: string): Promise<KnowledgeDocument | null>;
  searchByVector(embedding: number[], topK?: number, category?: string): Promise<DocumentSearchResult[]>;
  save(document: KnowledgeDocument): Promise<void>;
  delete(id: string): Promise<void>;
  listAll(category?: string, limit?: number): Promise<KnowledgeDocument[]>;
}
