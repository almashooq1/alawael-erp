"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
const apollo_server_express_1 = require("apollo-server-express");
exports.typeDefs = (0, apollo_server_express_1.gql) `
  # User Types
  type User {
    id: ID!
    email: String!
    username: String!
    role: UserRole!
    createdAt: String!
    updatedAt: String!
    projects: [Project!]!
    profile: UserProfile
  }

  type UserProfile {
    firstName: String
    lastName: String
    avatar: String
    bio: String
    location: String
  }

  enum UserRole {
    ADMIN
    USER
    GUEST
  }

  # Project Types
  type Project {
    id: ID!
    name: String!
    description: String
    status: ProjectStatus!
    userId: ID!
    user: User!
    datasets: [Dataset!]!
    models: [Model!]!
    createdAt: String!
    updatedAt: String!
    stats: ProjectStats
  }

  enum ProjectStatus {
    ACTIVE
    COMPLETED
    ARCHIVED
    DRAFT
  }

  type ProjectStats {
    totalDatasets: Int!
    totalModels: Int!
    totalPredictions: Int!
    lastActivity: String
  }

  # Dataset Types
  type Dataset {
    id: ID!
    name: String!
    type: DatasetType!
    size: Int!
    projectId: ID!
    project: Project!
    records: Int!
    columns: [String!]
    createdAt: String!
    metadata: DatasetMetadata
  }

  enum DatasetType {
    CSV
    JSON
    EXCEL
    DATABASE
  }

  type DatasetMetadata {
    encoding: String
    delimiter: String
    headers: Boolean
    preview: [String!]
  }

  # Model Types
  type Model {
    id: ID!
    name: String!
    type: ModelType!
    status: ModelStatus!
    projectId: ID!
    project: Project!
    accuracy: Float
    trainingTime: Int
    parameters: ModelParameters
    predictions: [Prediction!]!
    createdAt: String!
    updatedAt: String!
  }

  enum ModelType {
    DEEP_LEARNING
    MACHINE_LEARNING
    ENSEMBLE
    CUSTOM
  }

  enum ModelStatus {
    TRAINING
    TRAINED
    DEPLOYED
    FAILED
  }

  type ModelParameters {
    inputSize: Int
    hiddenLayers: [Int!]
    outputSize: Int
    epochs: Int
    batchSize: Int
    learningRate: Float
  }

  # Prediction Types
  type Prediction {
    id: ID!
    modelId: ID!
    model: Model!
    input: String!
    output: String!
    confidence: Float
    createdAt: String!
  }

  # Analytics Types
  type Analytics {
    overview: AnalyticsOverview!
    trends: AnalyticsTrends!
    performance: AnalyticsPerformance!
  }

  type AnalyticsOverview {
    totalUsers: Int!
    totalProjects: Int!
    totalDatasets: Int!
    totalModels: Int!
    totalPredictions: Int!
  }

  type AnalyticsTrends {
    daily: [TrendData!]!
    weekly: [TrendData!]!
    monthly: [TrendData!]!
  }

  type TrendData {
    date: String!
    users: Int!
    projects: Int!
    predictions: Int!
  }

  type AnalyticsPerformance {
    avgResponseTime: Float!
    avgAccuracy: Float!
    topModels: [Model!]!
    activeUsers: Int!
  }

  # Input Types
  input CreateUserInput {
    email: String!
    username: String!
    password: String!
    role: UserRole
  }

  input UpdateUserInput {
    email: String
    username: String
    role: UserRole
  }

  input CreateProjectInput {
    name: String!
    description: String
    status: ProjectStatus
  }

  input UpdateProjectInput {
    name: String
    description: String
    status: ProjectStatus
  }

  input CreateDatasetInput {
    name: String!
    type: DatasetType!
    projectId: ID!
    data: String!
  }

  input CreateModelInput {
    name: String!
    type: ModelType!
    projectId: ID!
    parameters: ModelParametersInput!
  }

  input ModelParametersInput {
    inputSize: Int!
    hiddenLayers: [Int!]!
    outputSize: Int!
    epochs: Int
    batchSize: Int
    learningRate: Float
  }

  input TrainModelInput {
    modelId: ID!
    datasetId: ID!
    parameters: ModelParametersInput
  }

  input PredictInput {
    modelId: ID!
    input: String!
  }

  input FilterInput {
    field: String!
    operator: FilterOperator!
    value: String!
  }

  enum FilterOperator {
    EQUALS
    NOT_EQUALS
    CONTAINS
    GREATER_THAN
    LESS_THAN
    IN
  }

  input PaginationInput {
    page: Int
    limit: Int
    sortBy: String
    sortOrder: SortOrder
  }

  enum SortOrder {
    ASC
    DESC
  }

  # Response Types
  type AuthPayload {
    token: String!
    user: User!
  }

  type PaginatedProjects {
    projects: [Project!]!
    total: Int!
    page: Int!
    pages: Int!
  }

  type PaginatedDatasets {
    datasets: [Dataset!]!
    total: Int!
    page: Int!
    pages: Int!
  }

  type PaginatedModels {
    models: [Model!]!
    total: Int!
    page: Int!
    pages: Int!
  }

  type MutationResponse {
    success: Boolean!
    message: String!
    data: String
  }

  # Queries
  type Query {
    # User Queries
    me: User!
    user(id: ID!): User
    users(pagination: PaginationInput): [User!]!

    # Project Queries
    project(id: ID!): Project
    projects(
      userId: ID
      status: ProjectStatus
      filters: [FilterInput!]
      pagination: PaginationInput
    ): PaginatedProjects!
    projectStats(projectId: ID!): ProjectStats!

    # Dataset Queries
    dataset(id: ID!): Dataset
    datasets(
      projectId: ID
      type: DatasetType
      pagination: PaginationInput
    ): PaginatedDatasets!

    # Model Queries
    model(id: ID!): Model
    models(
      projectId: ID
      type: ModelType
      status: ModelStatus
      pagination: PaginationInput
    ): PaginatedModels!

    # Prediction Queries
    prediction(id: ID!): Prediction
    predictions(modelId: ID!, pagination: PaginationInput): [Prediction!]!

    # Analytics Queries
    analytics(
      startDate: String
      endDate: String
      projectId: ID
    ): Analytics!

    # Search
    search(query: String!, type: String): [SearchResult!]!
  }

  union SearchResult = User | Project | Dataset | Model

  # Mutations
  type Mutation {
    # Auth Mutations
    register(input: CreateUserInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    logout: MutationResponse!
    refreshToken: AuthPayload!

    # User Mutations
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): MutationResponse!

    # Project Mutations
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): MutationResponse!
    archiveProject(id: ID!): Project!

    # Dataset Mutations
    createDataset(input: CreateDatasetInput!): Dataset!
    deleteDataset(id: ID!): MutationResponse!
    uploadDataset(projectId: ID!, file: Upload!): Dataset!

    # Model Mutations
    createModel(input: CreateModelInput!): Model!
    trainModel(input: TrainModelInput!): Model!
    deployModel(id: ID!): Model!
    deleteModel(id: ID!): MutationResponse!

    # Prediction Mutations
    predict(input: PredictInput!): Prediction!
    batchPredict(modelId: ID!, inputs: [String!]!): [Prediction!]!
  }

  # Subscriptions
  type Subscription {
    # Model Training
    modelTrainingProgress(modelId: ID!): TrainingProgress!
    modelStatusChanged(modelId: ID!): Model!

    # Real-time Updates
    projectUpdated(projectId: ID!): Project!
    newPrediction(modelId: ID!): Prediction!

    # System Updates
    systemNotification: Notification!
  }

  type TrainingProgress {
    modelId: ID!
    epoch: Int!
    totalEpochs: Int!
    loss: Float!
    accuracy: Float
    status: String!
  }

  type Notification {
    id: ID!
    type: NotificationType!
    title: String!
    message: String!
    data: String
    createdAt: String!
  }

  enum NotificationType {
    INFO
    SUCCESS
    WARNING
    ERROR
  }

  scalar Upload
`;
