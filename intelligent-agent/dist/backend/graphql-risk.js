"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGraphQL = setupGraphQL;
const apollo_server_express_1 = require("apollo-server-express");
const risk_model_1 = __importDefault(require("./models/risk.model"));
const typeDefs = (0, apollo_server_express_1.gql) `
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
        risks: async () => await risk_model_1.default.find(),
        risk: async (_, { id }) => await risk_model_1.default.findById(id),
    },
    Mutation: {
        addRisk: async (_, { input }) => {
            const risk = new risk_model_1.default(input);
            await risk.save();
            return risk;
        },
        updateRisk: async (_, { id, input }) => {
            return await risk_model_1.default.findByIdAndUpdate(id, input, { new: true });
        },
        deleteRisk: async (_, { id }) => {
            await risk_model_1.default.findByIdAndDelete(id);
            return true;
        },
    },
};
function setupGraphQL(app) {
    const server = new apollo_server_express_1.ApolloServer({ typeDefs, resolvers });
    server.start().then(() => {
        server.applyMiddleware({ app, path: '/graphql' });
    });
}
