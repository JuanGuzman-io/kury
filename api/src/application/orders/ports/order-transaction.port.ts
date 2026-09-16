export interface OrderTransactionPort {
  execute<T>(orderId: string, work: () => Promise<T>): Promise<T>;
}
