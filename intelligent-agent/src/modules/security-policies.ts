export interface DynamicPolicyRule {
  id: string;
  condition: (context: any) => boolean;
  overrides: Partial<SecurityPolicy>;
  description?: string;
}
export interface PolicyChangeLog {
  timestamp: string;
  userId?: string;
  changes: Partial<SecurityPolicy>;
}

// Security Policies Module
export interface SecurityPolicy {
  passwordMinLength: number;
  passwordRequireSymbols: boolean;
  sessionTimeoutMinutes: number;
  mfaEnabled: boolean;
  maxFailedLogins: number;
}


const defaultPolicy: SecurityPolicy = {
  passwordMinLength: 8,
  passwordRequireSymbols: true,
  sessionTimeoutMinutes: 30,
  mfaEnabled: true,
  maxFailedLogins: 5,
};

export class SecurityPolicies {
  private dynamicRules: DynamicPolicyRule[] = [];
  private changeLog: PolicyChangeLog[] = [];
  private policy: SecurityPolicy = { ...defaultPolicy };

  addDynamicRule(rule: Omit<DynamicPolicyRule, 'id'>) {
    const r: DynamicPolicyRule = { ...rule, id: Math.random().toString(36).slice(2) };
    this.dynamicRules.push(r);
    return r;
  }
  removeDynamicRule(id: string) {
    this.dynamicRules = this.dynamicRules.filter(r => r.id !== id);
  }
  listDynamicRules(): DynamicPolicyRule[] {
    return this.dynamicRules;
  }
  getChangeLog(): PolicyChangeLog[] {
    return [...this.changeLog];
  }

  getPolicy(context?: any): SecurityPolicy {
    let result = { ...this.policy };
    for (const rule of this.dynamicRules) {
      if (rule.condition(context)) {
        result = { ...result, ...rule.overrides };
      }
    }
    return result;
  }

  updatePolicy(updates: Partial<SecurityPolicy>, userId?: string) {
    this.policy = { ...this.policy, ...updates };
    this.changeLog.push({ timestamp: new Date().toISOString(), userId, changes: updates });
  }


  exportPolicy(): SecurityPolicy {
    return { ...this.policy };
  }
}


