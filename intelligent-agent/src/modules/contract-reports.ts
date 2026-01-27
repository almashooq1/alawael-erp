// تقارير وتحليلات العقود
import { ContractManager } from './contract-manager';

export interface ContractReport {
  total: number;
  active: number;
  expired: number;
  terminated: number;
  pending: number;
  totalValue: number;
  avgValue: number;
  soonToExpire: number;
  byParty: Record<string, number>;
}

export function getContractReport(): ContractReport {
  const manager = new ContractManager();
  const contracts = manager.listContracts();
  const now = new Date();
  let soonToExpire = 0;
  const byParty: Record<string, number> = {};
  for (const c of contracts) {
    for (const p of c.parties) byParty[p] = (byParty[p] || 0) + 1;
    const end = new Date(c.endDate);
    if (c.status === 'active' && end > now && end <= new Date(now.getTime() + 30*24*60*60*1000)) soonToExpire++;
  }
  const totalValue = contracts.reduce((sum, c) => sum + (c.value || 0), 0);
  return {
    total: contracts.length,
    active: contracts.filter(c=>c.status==='active').length,
    expired: contracts.filter(c=>c.status==='expired').length,
    terminated: contracts.filter(c=>c.status==='terminated').length,
    pending: contracts.filter(c=>c.status==='pending').length,
    totalValue,
    avgValue: contracts.length ? Math.round(totalValue/contracts.length) : 0,
    soonToExpire,
    byParty
  };
}
