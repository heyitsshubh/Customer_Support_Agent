import postgres from 'postgres';
import { IDocumentRepository, DocumentSearchResult } from '../../../domain/interfaces/IDocumentRepository.js';
import { KnowledgeDocument } from '../../../domain/entities/Document.js';

export class PgDocumentRepository implements IDocumentRepository {
  constructor(private readonly sql: postgres.Sql) {}

  async findById(id: string): Promise<KnowledgeDocument | null> {
    const rows = await this.sql`
      SELECT id, title, content, category, source, metadata, created_at, updated_at
      FROM documents
      WHERE id = ${id}
      LIMIT 1;
    `;
    if (rows.length === 0) return null;
    return this.mapToDomain(rows[0]);
  }

  async searchByVector(embedding: number[], topK = 3, category?: string): Promise<DocumentSearchResult[]> {
    const vectorString = `[${embedding.join(',')}]`;

    // 1 - (embedding <=> vector) computes cosine similarity where 1 is identical
    const rows = await this.sql`
      SELECT id, title, content, category, source, metadata, created_at, updated_at,
             (1 - (embedding <=> ${vectorString}::vector)) AS similarity_score
      FROM documents
      WHERE (${category ? this.sql`category = ${category}` : this.sql`TRUE`})
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorString}::vector ASC
      LIMIT ${topK};
    `;

    return rows.map((r) => ({
      document: this.mapToDomain(r),
      similarityScore: Number(r.similarity_score) || 0,
    }));
  }

  async listAll(category?: string, limit = 50): Promise<KnowledgeDocument[]> {
    const rows = await this.sql`
      SELECT id, title, content, category, source, metadata, created_at, updated_at
      FROM documents
      WHERE (${category ? this.sql`category = ${category}` : this.sql`TRUE`})
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;
    return rows.map((r) => this.mapToDomain(r));
  }

  async save(document: KnowledgeDocument): Promise<void> {
    const vectorString = document.embedding ? `[${document.embedding.join(',')}]` : null;

    await this.sql`
      INSERT INTO documents (id, title, content, category, embedding, source, metadata, created_at, updated_at)
      VALUES (
        ${document.id},
        ${document.title},
        ${document.content},
        ${document.category},
        ${vectorString ? this.sql`${vectorString}::vector` : null},
        ${document.source || null},
        ${JSON.stringify(document.metadata)}::jsonb,
        ${document.createdAt},
        ${document.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        category = EXCLUDED.category,
        embedding = EXCLUDED.embedding,
        source = EXCLUDED.source,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at;
    `;
  }

  async delete(id: string): Promise<void> {
    await this.sql`
      DELETE FROM documents WHERE id = ${id};
    `;
  }

  private mapToDomain(row: Record<string, unknown>): KnowledgeDocument {
    return new KnowledgeDocument(
      row.id as string,
      row.title as string,
      row.content as string,
      row.category as string,
      undefined, // Embedding array omitted from default read to keep memory footprint light
      row.source as string | undefined,
      (row.metadata as Record<string, unknown>) || {},
      new Date(row.created_at as string),
      new Date(row.updated_at as string)
    );
  }
}
