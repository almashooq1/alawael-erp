
import express from 'express';
import mongoose from 'mongoose';
import riskRoutes from './routes/risk.routes';
import riskAttachmentsRoutes from './routes/risk.attachments.routes';
import riskIntegrationRoutes from './routes/risk.integration.routes';
import crmCustomerRoutes from './routes/crm.customer.routes';
import crmOpportunityRoutes from './routes/crm.opportunity.routes';
import crmTicketRoutes from './routes/crm.ticket.routes';
import path from 'path';
import { setupGraphQL } from './graphql-risk';
import { setupCrmGraphQL } from './graphql-crm';

const app = express();

// GraphQL API for risks
setupGraphQL(app);
// GraphQL API for CRM
setupCrmGraphQL(app);


app.use(express.json());

// Risk Management API
app.use('/api', riskRoutes);
app.use('/api', riskAttachmentsRoutes);
app.use('/api', riskIntegrationRoutes);

// CRM API
app.use('/api/customers', crmCustomerRoutes);
app.use('/api/opportunities', crmOpportunityRoutes);
app.use('/api/tickets', crmTicketRoutes);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Connect to MongoDB (update URI as needed)
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/intelligent-agent')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


export default app;
