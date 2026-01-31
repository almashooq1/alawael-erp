"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleQueries = void 0;
exports.createGraphQLServer = createGraphQLServer;
const apollo_server_express_1 = require("apollo-server-express");
const apollo_server_core_1 = require("apollo-server-core");
const schema_1 = require("@graphql-tools/schema");
const http_1 = __importDefault(require("http"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const schema_2 = require("./schema");
const resolvers_1 = require("./resolvers");
async function createGraphQLServer(app) {
    const httpServer = http_1.default.createServer(app);
    // Create schema
    const schema = (0, schema_1.makeExecutableSchema)({ typeDefs: schema_2.typeDefs, resolvers: resolvers_1.resolvers });
    // WebSocket subscriptions disabled for compatibility
    // To enable: npm install graphql-ws and uncomment WebSocket code
    // Create Apollo Server
    const server = new apollo_server_express_1.ApolloServer({
        schema,
        context: ({ req }) => {
            // Get auth token from header
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (token) {
                try {
                    const user = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
                    return { user };
                }
                catch (error) {
                    return {};
                }
            }
            return {};
        },
        plugins: [
            (0, apollo_server_core_1.ApolloServerPluginDrainHttpServer)({ httpServer })
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
exports.exampleQueries = `
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
