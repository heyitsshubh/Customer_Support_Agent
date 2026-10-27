import { Money } from '../value-objects/Money.js';

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

export interface OrderItem {
  itemId: string;
  name: string;
  qty: number;
  price: number;
}

export class Order {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly orderNumber: string,
    public status: OrderStatus,
    public totalAmount: Money,
    public items: OrderItem[] = [],
    public trackingNumber?: string,
    public carrier?: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  public isDelivered(): boolean {
    return this.status === 'delivered';
  }

  public isShipped(): boolean {
    return this.status === 'shipped';
  }

  public canBeCancelled(): boolean {
    return this.status === 'pending' || this.status === 'processing';
  }
}
