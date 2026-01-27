import React from 'react';
import CustomerList from './CustomerList';
import OpportunityList from './OpportunityList';
import TicketList from './TicketList';
import CrmAIDashboard from './CrmAIDashboard';
import React, { useState, useEffect } from 'react';

export default function CrmDashboard() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [opps, setOpps] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers);
    fetch('/api/opportunities').then(r => r.json()).then(setOpps);
    fetch('/api/tickets').then(r => r.json()).then(setTickets);
  }, []);
  return (
    <div style={{maxWidth:1000,margin:'auto',padding:32}}>
      <h2>Smart CRM Dashboard</h2>
      <CrmAIDashboard customers={customers} opportunities={opps} tickets={tickets} />
      <div style={{display:'flex',gap:24,marginTop:32}}>
        <div style={{flex:1,background:'#fff',borderRadius:8,boxShadow:'0 2px 8px #eee',padding:24}}>
          <h3>Customers</h3>
          <CustomerList />
        </div>
        <div style={{flex:1,background:'#fff',borderRadius:8,boxShadow:'0 2px 8px #eee',padding:24}}>
          <h3>Opportunities</h3>
          <OpportunityList />
        </div>
        <div style={{flex:1,background:'#fff',borderRadius:8,boxShadow:'0 2px 8px #eee',padding:24}}>
          <h3>Tickets</h3>
          <TicketList />
        </div>
      </div>
    </div>
  );
}
