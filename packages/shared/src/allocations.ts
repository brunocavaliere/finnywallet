export type Allocation = {
  symbol: string;
  target: number;
};

export function normalizeAllocations(allocations: Allocation[]): Allocation[] {
  return allocations;
}
