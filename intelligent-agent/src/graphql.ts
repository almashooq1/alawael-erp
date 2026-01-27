// إعداد GraphQL API أساسي
import { ApolloServer, gql } from 'apollo-server-express';
import { PubSub } from 'graphql-subscriptions';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { AgentCore } from './core/agent-core';

const typeDefs = gql`
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

const agent = new AgentCore();
const pubsub: PubSub = new PubSub();
const EVENT_TOPIC = 'EVENT_TOPIC';

const resolvers = {
  Query: {
    health: (_: any, { lang }: { lang: string }) => lang === 'en' ? 'System is healthy' : 'النظام يعمل بنجاح',
    nlp: (_: any, { text }: { text: string }) => agent.nlp.analyzeText(text)
  },
  Subscription: {
    eventStream: {
      subscribe: () => (pubsub as any).asyncIterator([EVENT_TOPIC])
    }
  }
};

export function setupGraphQL(app: any, httpServer?: any) {
  const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core');
  const { useServer } = require('graphql-ws/lib/use/ws');
  const WebSocket = require('ws');
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const server = new ApolloServer({
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
export function publishEvent(message: string) {
  pubsub.publish(EVENT_TOPIC, { eventStream: { message, timestamp: new Date().toISOString() } });
}
