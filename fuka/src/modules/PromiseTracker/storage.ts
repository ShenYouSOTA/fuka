import type { ExtractedPromise } from '../../types/index.js';
import { SqlitePromiseRepository } from '../../repository/sqlite.repository.js';
import type { IPromiseRepository } from '../../repository/interfaces.js';

export class PromiseStorage {
  private repo: IPromiseRepository;

  constructor(repo?: IPromiseRepository) {
    this.repo = repo ?? new SqlitePromiseRepository();
  }

  async save(userId: string, promise: ExtractedPromise): Promise<string> {
    return this.repo.save({
      userId,
      content: promise.content,
      targetPerson: promise.targetPerson,
      dueAt: promise.dueAt,
    });
  }

  async findPending() {
    return this.repo.findPending();
  }

  async updateStatus(id: string, status: string): Promise<void> {
    return this.repo.updateStatus(id, status);
  }
}
