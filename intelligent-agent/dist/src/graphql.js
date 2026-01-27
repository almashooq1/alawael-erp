"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGraphQL = setupGraphQL;
exports.publishEvent = publishEvent;
// إعداد GraphQL API أساسي
const apollo_server_express_1 = require("apollo-server-express");
const graphql_subscriptions_1 = require("graphql-subscriptions");
const schema_1 = require("@graphql-tools/schema");
const agent_core_1 = require("./core/agent-core");
const typeDefs = (0, apollo_server_express_1.gql) `
  type Query {
    health(lang: String): String
    nlp(text: String!): NLPResult
  }
  type NLPResult {
    sentiment: String
    keywords: [String]
  }
  type Event {
    message: String!
    timestamp: String!
  }
  type Subscription {
    eventStream: Event!
  }
`;
const agent = new agent_core_1.AgentCore();
const pubsub = new graphql_subscriptions_1.PubSub();
const EVENT_TOPIC = 'EVENT_TOPIC';
const resolvers = {
    Query: {
        health: (_, { lang }) => lang === 'en' ? 'System is healthy' : 'النظام يعمل بنجاح',
        nlp: (_, { text }) => agent.nlp.analyzeText(text)
    },
    Subscription: {
        eventStream: {
            subscribe: () => pubsub.asyncIterator([EVENT_TOPIC])
        }
    }
};
function setupGraphQL(app, httpServer) {
    const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core');
    const { useServer } = require('graphql-ws/lib/use/ws');
    const WebSocket = require('ws');
    const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers });
    const server = new apollo_server_express_1.ApolloServer({
        schema,
        plugins: httpServer ? [ApolloServerPluginDrainHttpServer({ httpServer })] : [],
    });
    server.start().then(() => {
        server.applyMiddleware({ app, path: '/graphql' });
        if (httpServer) {
            // Set up graphql-ws for subscriptions
            const wsServer = new WebSocket.Server({ server: httpServer, path: '/graphql' });
            useServer({ schema }, wsServer);
        }
    });
}
// Helper to publish events
function publishEvent(message) {
    pubsub.publish(EVENT_TOPIC, { eventStream: { message, timestamp: new Date().toISOString() } });
}
