// src/modules/contract-manager.ts
// Advanced Contract Management Module
// Provides contract creation, tracking, renewal, and compliance features

export interface Contract {
  id: string;
  title: string;
  parties: string[];
  startDate: string;
  endDate: string;
  value: number;
  status: 'active' | 'expired' | 'terminated' | 'pending';
  terms: string;
  ownerId?: string; // المستخدم المالك للعقد
  metadata?: Record<string, any>;
}

const contracts: Contract[] = [];

function generateId() {
  return 'C' + Math.random().toString(36).slice(2, 10);
}

export class ContractManager {
  listContracts() {
    return contracts;
  }
  getContract(id: string) {
    return contracts.find(c => c.id === id);
  }
  createContract(data: Omit<Contract, 'id' | 'status'> & { status?: Contract['status'] }) {
    const contract: Contract = {
      id: generateId(),
      status: data.status || 'pending',
      ...data,
    };
    contracts.push(contract);
    return contract;
  }
  updateContract(id: string, data: Partial<Omit<Contract, 'id'>>) {
    const c = contracts.find(c => c.id === id);
    if (!c) return null;
    Object.assign(c, data);
    return c;
  }
  deleteContract(id: string) {
    const idx = contracts.findIndex(c => c.id === id);
    if (idx === -1) return false;
    contracts.splice(idx, 1);
    return true;
  }
  renewContract(id: string, newEndDate: string) {
    const c = contracts.find(c => c.id === id);
    if (!c) return null;
    c.endDate = newEndDate;
    c.status = 'active';
    return c;
  }
  setStatus(id: string, status: Contract['status']) {
    const c = contracts.find(c => c.id === id);
    if (!c) return null;
    c.status = status;
    return c;
  }
}
