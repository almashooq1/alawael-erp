import { ApolloServer, gql } from 'apollo-server-express';
import Customer from './models/crm.customer.model';
import Opportunity from './models/crm.opportunity.model';
import Ticket from './models/crm.ticket.model';

const typeDefs = gql`
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
    customers: async () => Customer.find(),
    customer: async (_: any, { id }: any) => Customer.findById(id),
    opportunities: async () => Opportunity.find().populate('customer'),
    opportunity: async (_: any, { id }: any) => Opportunity.findById(id).populate('customer'),
    tickets: async () => Ticket.find().populate('customer'),
    ticket: async (_: any, { id }: any) => Ticket.findById(id).populate('customer'),
  },
  Mutation: {
    createCustomer: async (_: any, { input }: any) => Customer.create(input),
    updateCustomer: async (_: any, { id, input }: any) => Customer.findByIdAndUpdate(id, input, { new: true }),
    deleteCustomer: async (_: any, { id }: any) => !!(await Customer.findByIdAndDelete(id)),
    createOpportunity: async (_: any, { input }: any) => Opportunity.create(input),
    updateOpportunity: async (_: any, { id, input }: any) => Opportunity.findByIdAndUpdate(id, input, { new: true }),
    deleteOpportunity: async (_: any, { id }: any) => !!(await Opportunity.findByIdAndDelete(id)),
    createTicket: async (_: any, { input }: any) => Ticket.create(input),
    updateTicket: async (_: any, { id, input }: any) => Ticket.findByIdAndUpdate(id, input, { new: true }),
    deleteTicket: async (_: any, { id }: any) => !!(await Ticket.findByIdAndDelete(id)),
  },
};

export function setupCrmGraphQL(app: any) {
  const server = new ApolloServer({ typeDefs, resolvers });
  server.start().then(() => {
    server.applyMiddleware({ app, path: '/crm-graphql' });
  });
}
