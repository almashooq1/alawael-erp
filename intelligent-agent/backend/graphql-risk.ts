import { ApolloServer, gql } from 'apollo-server-express';
import Risk from './models/risk.model';

const typeDefs = gql`
  type Risk {
    _id: ID!
    title: String!
    description: String!
    category: String!
    likelihood: Int!
    impact: Int!
    owner: String!
    status: String!
    attachments: [Attachment]
    createdAt: String!
    updatedAt: String!
  }
  type Attachment {
    filename: String!
    url: String!
    uploadedAt: String!
    uploadedBy: String!
  }
  type Query {
    risks: [Risk]
    risk(id: ID!): Risk
  }
  input RiskInput {
    title: String!
    description: String!
    category: String!
    likelihood: Int!
    impact: Int!
    owner: String!
    status: String!
  }
  type Mutation {
    addRisk(input: RiskInput!): Risk
    updateRisk(id: ID!, input: RiskInput!): Risk
    deleteRisk(id: ID!): Boolean
  }
`;

const resolvers = {
  Query: {
    risks: async () => await Risk.find(),
    risk: async (_: any, { id }: any) => await Risk.findById(id),
  },
  Mutation: {
    addRisk: async (_: any, { input }: any) => {
      const risk = new Risk(input);
      await risk.save();
      return risk;
    },
    updateRisk: async (_: any, { id, input }: any) => {
      return await Risk.findByIdAndUpdate(id, input, { new: true });
    },
    deleteRisk: async (_: any, { id }: any) => {
      await Risk.findByIdAndDelete(id);
      return true;
    },
  },
};

export function setupGraphQL(app: any) {
  const server = new ApolloServer({ typeDefs, resolvers });
  server.start().then(() => {
    server.applyMiddleware({ app, path: '/graphql' });
  });
}
