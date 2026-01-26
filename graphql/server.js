/**
 * 🚀 GraphQL Server - AlAwael ERP v3.0
 * Modern GraphQL API with Apollo Server
 * Features: Type Safety, Real-time Subscriptions, DataLoader for N+1
 */

const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const DataLoader = require('dataloader');

// Type Definitions
const typeDefs = `
  # Scalars
  scalar DateTime
  scalar Upload

  # Enums
  enum Role {
    ADMIN
    MANAGER
    EMPLOYEE
    HR
    FINANCE
  }

  enum Status {
    ACTIVE
    INACTIVE
    PENDING
    SUSPENDED
  }

  # Types
  type User {
    id: ID!
    username: String!
    email: String!
    firstName: String
    lastName: String
    fullName: String
    role: Role!
    status: Status!
    department: Department
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Department {
    id: ID!
    name: String!
    code: String!
    description: String
    manager: User
    employees: [User!]!
    createdAt: DateTime!
  }

  type Beneficiary {
    id: ID!
    name: String!
    nationalId: String!
    dateOfBirth: DateTime
    age: Int
    gender: String
    phone: String
    email: String
    address: String
    status: Status!
    programs: [Program!]!
    sessions: [Session!]!
    createdAt: DateTime!
  }

  type Program {
    id: ID!
    name: String!
    description: String
    type: String!
    duration: Int
    beneficiaries: [Beneficiary!]!
    sessions: [Session!]!
    status: Status!
    createdAt: DateTime!
  }

  type Session {
    id: ID!
    title: String!
    program: Program!
    beneficiary: Beneficiary!
    therapist: User!
    scheduledAt: DateTime!
    duration: Int!
    status: String!
    notes: String
    createdAt: DateTime!
  }

  type Report {
    id: ID!
    title: String!
    type: String!
    data: String!
    generatedBy: User!
    createdAt: DateTime!
  }

  # Pagination
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type UserEdge {
    node: User!
    cursor: String!
  }

  # Inputs
  input CreateUserInput {
    username: String!
    email: String!
    password: String!
    firstName: String
    lastName: String
    role: Role!
    departmentId: ID
  }

  input UpdateUserInput {
    email: String
    firstName: String
    lastName: String
    role: Role
    status: Status
    departmentId: ID
  }

  input UserFilter {
    role: Role
    status: Status
    departmentId: ID
    search: String
  }

  input Pagination {
    first: Int
    after: String
    last: Int
    before: String
  }

  input CreateBeneficiaryInput {
    name: String!
    nationalId: String!
    dateOfBirth: DateTime
    gender: String!
    phone: String
    email: String
    address: String
  }

  # Queries
  type Query {
    # Users
    users(filter: UserFilter, pagination: Pagination): UserConnection!
    user(id: ID!): User
    me: User
    
    # Beneficiaries
    beneficiaries(filter: UserFilter, pagination: Pagination): [Beneficiary!]!
    beneficiary(id: ID!): Beneficiary
    
    # Programs
    programs(filter: UserFilter): [Program!]!
    program(id: ID!): Program
    
    # Sessions
    sessions(filter: UserFilter, pagination: Pagination): [Session!]!
    session(id: ID!): Session
    
    # Reports
    reports(type: String, pagination: Pagination): [Report!]!
    report(id: ID!): Report
    
    # Analytics
    analytics(startDate: DateTime, endDate: DateTime): Analytics!
  }

  # Mutations
  type Mutation {
    # Authentication
    login(username: String!, password: String!): AuthPayload!
    logout: Boolean!
    refreshToken(token: String!): AuthPayload!
    
    # Users
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!
    
    # Beneficiaries
    createBeneficiary(input: CreateBeneficiaryInput!): Beneficiary!
    updateBeneficiary(id: ID!, input: CreateBeneficiaryInput!): Beneficiary!
    deleteBeneficiary(id: ID!): Boolean!
    
    # Programs
    createProgram(name: String!, description: String): Program!
    updateProgram(id: ID!, name: String, description: String): Program!
    deleteProgram(id: ID!): Boolean!
    
    # Sessions
    createSession(programId: ID!, beneficiaryId: ID!, scheduledAt: DateTime!): Session!
    updateSession(id: ID!, status: String, notes: String): Session!
    cancelSession(id: ID!): Boolean!
  }

  # Subscriptions
  type Subscription {
    userCreated: User!
    userUpdated(id: ID): User!
    sessionScheduled: Session!
    notificationReceived: Notification!
  }

  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
  }

  type Analytics {
    totalUsers: Int!
    totalBeneficiaries: Int!
    totalPrograms: Int!
    totalSessions: Int!
    activeUsers: Int!
    sessionsToday: Int!
  }

  type Notification {
    id: ID!
    title: String!
    message: String!
    type: String!
    userId: ID!
    read: Boolean!
    createdAt: DateTime!
  }
`;

// Resolvers
const resolvers = {
  Query: {
    users: async (_, { filter, pagination }, { dataSources, user }) => {
      // Check authentication
      if (!user) throw new Error('Not authenticated');
      
      // Fetch users with pagination
      const users = await dataSources.userAPI.getUsers(filter, pagination);
      return users;
    },
    
    user: async (_, { id }, { dataSources, user }) => {
      if (!user) throw new Error('Not authenticated');
      return await dataSources.userAPI.getUserById(id);
    },
    
    me: async (_, __, { dataSources, user }) => {
      if (!user) throw new Error('Not authenticated');
      return await dataSources.userAPI.getUserById(user.id);
    },
    
    beneficiaries: async (_, { filter, pagination }, { dataSources, user }) => {
      if (!user) throw new Error('Not authenticated');
      return await dataSources.beneficiaryAPI.getBeneficiaries(filter, pagination);
    },
    
    analytics: async (_, { startDate, endDate }, { dataSources, user }) => {
      if (!user) throw new Error('Not authenticated');
      return await dataSources.analyticsAPI.getAnalytics(startDate, endDate);
    },
  },

  Mutation: {
    login: async (_, { username, password }, { dataSources }) => {
      return await dataSources.authAPI.login(username, password);
    },
    
    createUser: async (_, { input }, { dataSources, user }) => {
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Not authorized');
      }
      return await dataSources.userAPI.createUser(input);
    },
    
    updateUser: async (_, { id, input }, { dataSources, user }) => {
      if (!user || (user.role !== 'ADMIN' && user.id !== id)) {
        throw new Error('Not authorized');
      }
      return await dataSources.userAPI.updateUser(id, input);
    },
    
    createBeneficiary: async (_, { input }, { dataSources, user }) => {
      if (!user) throw new Error('Not authenticated');
      return await dataSources.beneficiaryAPI.createBeneficiary(input);
    },
  },

  Subscription: {
    userCreated: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(['USER_CREATED']),
    },
    
    sessionScheduled: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(['SESSION_SCHEDULED']),
    },
    
    notificationReceived: {
      subscribe: (_, __, { pubsub, user }) => {
        if (!user) throw new Error('Not authenticated');
        return pubsub.asyncIterator([`NOTIFICATION_${user.id}`]);
      },
    },
  },

  // Field resolvers
  User: {
    fullName: (user) => `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    department: async (user, _, { dataSources, departmentLoader }) => {
      if (!user.departmentId) return null;
      return await departmentLoader.load(user.departmentId);
    },
  },

  Department: {
    manager: async (department, _, { dataSources, userLoader }) => {
      if (!department.managerId) return null;
      return await userLoader.load(department.managerId);
    },
    employees: async (department, _, { dataSources }) => {
      return await dataSources.userAPI.getUsersByDepartment(department.id);
    },
  },

  Beneficiary: {
    age: (beneficiary) => {
      if (!beneficiary.dateOfBirth) return null;
      const today = new Date();
      const birthDate = new Date(beneficiary.dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    },
    programs: async (beneficiary, _, { dataSources }) => {
      return await dataSources.programAPI.getProgramsByBeneficiary(beneficiary.id);
    },
  },
};

// DataLoader setup (prevents N+1 queries)
const createLoaders = (dataSources) => ({
  userLoader: new DataLoader(async (ids) => {
    const users = await dataSources.userAPI.getUsersByIds(ids);
    return ids.map(id => users.find(user => user.id === id));
  }),
  
  departmentLoader: new DataLoader(async (ids) => {
    const departments = await dataSources.departmentAPI.getDepartmentsByIds(ids);
    return ids.map(id => departments.find(dept => dept.id === id));
  }),
});

// Create executable schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Create Express app
const app = express();
const httpServer = http.createServer(app);

// WebSocket server for subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

const serverCleanup = useServer({ schema }, wsServer);

// Create Apollo Server
const server = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

// Start server
async function startServer() {
  await server.start();

  app.use(
    '/graphql',
    cors(),
    bodyParser.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Get user from token
        const token = req.headers.authorization?.replace('Bearer ', '');
        const user = token ? await verifyToken(token) : null;

        return {
          user,
          dataSources: createDataSources(),
          ...createLoaders(createDataSources()),
        };
      },
    })
  );

  const PORT = process.env.GRAPHQL_PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 GraphQL Server running at http://localhost:${PORT}/graphql`);
    console.log(`🔌 WebSocket Server running at ws://localhost:${PORT}/graphql`);
  });
}

// Helper functions (placeholder - implement with actual logic)
async function verifyToken(token) {
  // Implement JWT verification
  return null;
}

function createDataSources() {
  // Implement data sources
  return {
    userAPI: require('./datasources/UserAPI'),
    beneficiaryAPI: require('./datasources/BeneficiaryAPI'),
    programAPI: require('./datasources/ProgramAPI'),
    analyticsAPI: require('./datasources/AnalyticsAPI'),
    authAPI: require('./datasources/AuthAPI'),
    departmentAPI: require('./datasources/DepartmentAPI'),
  };
}

startServer().catch(console.error);

module.exports = { app, httpServer };
