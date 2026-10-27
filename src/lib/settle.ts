export interface Net {
  playerId: string
  amount: number
}

export interface Transfer {
  fromId: string
  toId: string
  amount: number
}

/**
 * Minimum number of shekel transfers that settle a zero-sum ledger.
 * Creditors have a positive amount (they are owed). Debtors are negative.
 * Greedy match of the largest remaining debt to the largest remaining credit.
 * Amounts are whole shekels; stakes in this league are integers, so the
 * books balance without rounding.
 */
export function minTransfers(nets: Net[]): Transfer[] {
  const debtors = nets
    .filter((n) => n.amount < 0)
    .map((n) => ({ id: n.playerId, left: -n.amount }))
    .sort((a, b) => b.left - a.left || a.id.localeCompare(b.id))
  const creditors = nets
    .filter((n) => n.amount > 0)
    .map((n) => ({ id: n.playerId, left: n.amount }))
    .sort((a, b) => b.left - a.left || a.id.localeCompare(b.id))

  const transfers: Transfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].left, creditors[j].left)
    if (amount > 0) {
      transfers.push({ fromId: debtors[i].id, toId: creditors[j].id, amount })
    }
    debtors[i].left -= amount
    creditors[j].left -= amount
    if (debtors[i].left === 0) i += 1
    if (creditors[j].left === 0) j += 1
  }
  return transfers
}
