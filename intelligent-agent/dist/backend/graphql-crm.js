"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCrmGraphQL = setupCrmGraphQL;
const apollo_server_express_1 = require("apollo-server-express");
const crm_customer_model_1 = __importDefault(require("./models/crm.customer.model"));
const crm_opportunity_model_1 = __importDefault(require("./models/crm.opportunity.model"));
const crm_ticket_model_1 = __importDefault(require("./models/crm.ticket.model"));
const typeDefs = (0, apollo_server_express_1.gql) `
  type Customer {
    id: ID!
    name: String!
    email: String!
    phone: String
    company: String
    tags: [String]
    status: String
    createdAt: String
    updatedAt: String
  }
  type Opportunity {
    id: ID!
    title: String!
    customer: Customer!
    value: Float
    stage: String
    expectedClose: String
    owner: ID
    notes: String
    tags: [String]
    createdAt: String
    updatedAt: String
  }
  type Ticket {
    id: ID!
    subject: String!
    customer: Customer!
    status: String
    priority: String
    assignedTo: ID
    messages: [TicketMessage]
    tags: [String]
    createdAt: String
    updatedAt: String
  }
  type TicketMessage {
    sender: ID!
    message: String!
    createdAt: String!
  }
  type Query {
    customers: [Customer]
    customer(id: ID!): Customer
    opportunities: [Opportunity]
    opportunity(id: ID!): Opportunity
    tickets: [Ticket]
    ticket(id: ID!): Ticket
  }
  input CustomerInput {
    name: String!
    email: String!
    phone: String
    company: String
    tags: [String]
    status: String
  }
  input OpportunityInput {
    title: String!
    customer: ID!
    value: Float
    stage: String
    expectedClose: String
    owner: ID
    notes: String
    tags: [String]
  }
  input TicketInput {
    subject: String!
    customer: ID!
    status: String
    priority: String
    assignedTo: ID
    messages: [TicketMessageInput]
    tags: [String]
  }
  input TicketMessageInput {
    sender: ID!
    message: String!
    createdAt: String
  }
  type Mutation {
    createCustomer(input: CustomerInput!): Customer
    updateCustomer(id: ID!, input: CustomerInput!): Customer
    deleteCustomer(id: ID!): Boolean
    createOpportunity(input: OpportunityInput!): Opportunity
    updateOpportunity(id: ID!, input: OpportunityInput!): Opportunity
    deleteOpportunity(id: ID!): Boolean
    createTicket(input: TicketInput!): Ticket
    updateTicket(id: ID!, input: TicketInput!): Ticket
    deleteTicket(id: ID!): Boolean
  }
`;
const resolvers = {
    Query: {
        customers: async () => crm_customer_model_1.default.find(),
        customer: async (_, { id }) => crm_customer_model_1.default.findById(id),
        opportunities: async () => crm_opportunity_model_1.default.find().populate('customer'),
        opportunity: async (_, { id }) => crm_opportunity_model_1.default.findById(id).populate('customer'),
        tickets: async () => crm_ticket_model_1.default.find().populate('customer'),
        ticket: async (_, { id }) => crm_ticket_model_1.default.findById(id).populate('customer'),
    },
    Mutation: {
        createCustomer: async (_, { input }) => crm_customer_model_1.default.create(input),
        updateCustomer: async (_, { id, input }) => crm_customer_model_1.default.findByIdAndUpdate(id, input, { new: true }),
        deleteCustomer: async (_, { id }) => !!(await crm_customer_model_1.default.findByIdAndDelete(id)),
        createOpportunity: async (_, { input }) => crm_opportunity_model_1.default.create(input),
        updateOpportunity: async (_, { id, input }) => crm_opportunity_model_1.default.findByIdAndUpdate(id, input, { new: true }),
        deleteOpportunity: async (_, { id }) => !!(await crm_opportunity_model_1.default.findByIdAndDelete(id)),
        createTicket: async (_, { input }) => crm_ticket_model_1.default.create(input),
        updateTicket: async (_, { id, input }) => crm_ticket_model_1.default.findByIdAndUpdate(id, input, { new: true }),
        deleteTicket: async (_, { id }) => !!(await crm_ticket_model_1.default.findByIdAndDelete(id)),
    },
};
function setupCrmGraphQL(app) {
    const server = new apollo_server_express_1.ApolloServer({ typeDefs, resolvers });
    server.start().then(() => {
        server.applyMiddleware({ app, path: '/crm-graphql' });
    });
}
