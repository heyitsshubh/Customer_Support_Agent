export class KnowledgeDocument {
  constructor(
    public readonly id: string,
    public title: string,
    public content: string,
    public category: string = 'general',
    public embedding?: number[],
    public source?: string,
    public metadata: Record<string, unknown> = {},
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  public updateContent(content: string, newEmbedding?: number[]): void {
    this.content = content;
    if (newEmbedding) {
      this.embedding = newEmbedding;
    }
    this.updatedAt = new Date();
  }
}
