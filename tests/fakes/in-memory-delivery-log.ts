import type { DeliveryLog, DeliveryRecord } from '../../src/message-queue';

export class InMemoryDeliveryLog implements DeliveryLog {
  private items = new Map<string, DeliveryRecord>();

  async save(record: DeliveryRecord): Promise<void> {
    this.items.set(record.messageId, record);
  }

  async findByMessageId(messageId: string): Promise<DeliveryRecord | undefined> {
    return this.items.get(messageId);
  }

  get size(): number {
    return this.items.size;
  }
}