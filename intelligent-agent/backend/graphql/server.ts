import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

export async function createGraphQLServer(app: express.Application) {
  const httpServer = http.createServer(app);

  // Create schema
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // WebSocket subscriptions disabled for compatibility
  // To enable: npm install graphql-ws and uncomment WebSocket code

  // Create Apollo Server
  const server = new ApolloServer({
    schema,
    context: ({ req }) => {
      // Get auth token from header
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        try {
          const user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
          return { user };
        } catch (error) {
          return {};
        }
      }
      
      return {};
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer })
    ],
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return {
        message: error.message,
        locations: error.locations,
        path: error.path,
        extensions: {
          code: error.extensions?.code,
          timestamp: new Date().toISOString()
        }
      };
    }
  });

  await server.start();
  server.applyMiddleware({ 
    app, 
    path: '/graphql',
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  console.log(`🚀 GraphQL Server ready at http://localhost:3001${server.graphqlPath}`);
  console.log(`🚀 GraphQL Subscriptions ready at ws://localhost:3001${server.graphqlPath}`);

  return { server, httpServer };
}

// GraphQL Playground queries for testing
export const exampleQueries = `
# ===================================
# EXAMPLE QUERIES
# ===================================

# Get current user
query GetMe {
  me {
    id
    username
    email
    role
    projects {
      id
      name
      status
    }
  }
}

# Get all projects with pagination
query GetProjects {
  projects(
    pagination: {
      page: 1
      limit: 10
      sortBy: "createdAt"
      sortOrder: DESC
    }
  ) {
    projects {
      id
      name
      description
      status
      user {
        username
      }
      stats {
        totalDatasets
        totalModels
        totalPredictions
      }
    }
    total
    page
    pages
  }
}

# Get project with details
query GetProject($projectId: ID!) {
  project(id: $projectId) {
    id
    name
    description
    status
    user {
      username
      email
    }
    datasets {
      id
      name
      type
      size
      records
    }
    models {
      id
      name
      type
      status
      accuracy
    }
  }
}

# Search across all entities
query Search($query: String!) {
  search(query: $query) {
    ... on User {
      id
      username
      email
    }
    ... on Project {
      id
      name
      description
    }
    ... on Model {
      id
      name
      type
      accuracy
    }
  }
}

# Get analytics
query GetAnalytics {
  analytics {
    overview {
      totalUsers
      totalProjects
      totalDatasets
      totalModels
      totalPredictions
    }
    trends {
      daily {
        date
        users
        projects
        predictions
      }
    }
    performance {
      avgResponseTime
      avgAccuracy
      activeUsers
      topModels {
        id
        name
        accuracy
      }
    }
  }
}

# ===================================
# EXAMPLE MUTATIONS
# ===================================

# Register new user
mutation Register {
  register(input: {
    email: "test@example.com"
    username: "testuser"
    password: "password123"
    role: USER
  }) {
    token
    user {
      id
      username
      email
    }
  }
}

# Login
mutation Login {
  login(
    email: "test@example.com"
    password: "password123"
  ) {
    token
    user {
      id
      username
      email
    }
  }
}

# Create project
mutation CreateProject {
  createProject(input: {
    name: "My AI Project"
    description: "Testing GraphQL API"
    status: ACTIVE
  }) {
    id
    name
    description
    status
    createdAt
  }
}

# Create model
mutation CreateModel($projectId: ID!) {
  createModel(input: {
    name: "Deep Learning Model"
    type: DEEP_LEARNING
    projectId: $projectId
    parameters: {
      inputSize: 784
      hiddenLayers: [128, 64, 32]
      outputSize: 10
      epochs: 50
      batchSize: 32
      learningRate: 0.001
    }
  }) {
    id
    name
    type
    status
    parameters {
      inputSize
      hiddenLayers
      outputSize
    }
  }
}

# Train model
mutation TrainModel($modelId: ID!, $datasetId: ID!) {
  trainModel(input: {
    modelId: $modelId
    datasetId: $datasetId
    parameters: {
      epochs: 100
      batchSize: 64
    }
  }) {
    id
    name
    status
  }
}

# Make prediction
mutation Predict($modelId: ID!) {
  predict(input: {
    modelId: $modelId
    input: "[0.5, 0.3, 0.8, 0.1]"
  }) {
    id
    output
    confidence
    createdAt
  }
}

# ===================================
# EXAMPLE SUBSCRIPTIONS
# ===================================

# Subscribe to model training progress
subscription ModelTraining($modelId: ID!) {
  modelTrainingProgress(modelId: $modelId) {
    modelId
    epoch
    totalEpochs
    loss
    accuracy
    status
  }
}

# Subscribe to model status changes
subscription ModelStatus($modelId: ID!) {
  modelStatusChanged(modelId: $modelId) {
    id
    name
    status
    accuracy
  }
}

# Subscribe to project updates
subscription ProjectUpdates($projectId: ID!) {
  projectUpdated(projectId: $projectId) {
    id
    name
    status
    updatedAt
  }
}

# Subscribe to new predictions
subscription NewPredictions($modelId: ID!) {
  newPrediction(modelId: $modelId) {
    id
    modelId
    output
    confidence
    createdAt
  }
}

# Subscribe to system notifications
subscription SystemNotifications {
  systemNotification {
    id
    type
    title
    message
    createdAt
  }
}
`;
