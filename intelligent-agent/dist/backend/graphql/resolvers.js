"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pubsub = exports.resolvers = void 0;
const graphql_subscriptions_1 = require("graphql-subscriptions");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const pubsub = new graphql_subscriptions_1.PubSub();
exports.pubsub = pubsub;
// Mock database (replace with actual database)
const db = {
    users: [],
    projects: [],
    datasets: [],
    models: [],
    predictions: []
};
exports.resolvers = {
    Query: {
        // User Queries
        me: async (_, __, context) => {
            if (!context.user)
                throw new Error('Not authenticated');
            return db.users.find((u) => u.id === context.user.id);
        },
        user: async (_, { id }) => {
            return db.users.find((u) => u.id === id);
        },
        users: async (_, { pagination }) => {
            let users = [...db.users];
            if (pagination?.sortBy) {
                users.sort((a, b) => {
                    const order = pagination.sortOrder === 'DESC' ? -1 : 1;
                    return a[pagination.sortBy] > b[pagination.sortBy] ? order : -order;
                });
            }
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 10;
            const start = (page - 1) * limit;
            return users.slice(start, start + limit);
        },
        // Project Queries
        project: async (_, { id }) => {
            return db.projects.find((p) => p.id === id);
        },
        projects: async (_, { userId, status, filters, pagination }) => {
            let projects = [...db.projects];
            // Filter by userId
            if (userId) {
                projects = projects.filter((p) => p.userId === userId);
            }
            // Filter by status
            if (status) {
                projects = projects.filter((p) => p.status === status);
            }
            // Apply custom filters
            if (filters) {
                filters.forEach((filter) => {
                    projects = projects.filter((p) => {
                        const value = p[filter.field];
                        switch (filter.operator) {
                            case 'EQUALS':
                                return value === filter.value;
                            case 'NOT_EQUALS':
                                return value !== filter.value;
                            case 'CONTAINS':
                                return String(value).includes(filter.value);
                            case 'GREATER_THAN':
                                return value > filter.value;
                            case 'LESS_THAN':
                                return value < filter.value;
                            case 'IN':
                                return filter.value.split(',').includes(String(value));
                            default:
                                return true;
                        }
                    });
                });
            }
            // Sort
            if (pagination?.sortBy) {
                projects.sort((a, b) => {
                    const order = pagination.sortOrder === 'DESC' ? -1 : 1;
                    return a[pagination.sortBy] > b[pagination.sortBy] ? order : -order;
                });
            }
            // Paginate
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 10;
            const start = (page - 1) * limit;
            const paginatedProjects = projects.slice(start, start + limit);
            return {
                projects: paginatedProjects,
                total: projects.length,
                page,
                pages: Math.ceil(projects.length / limit)
            };
        },
        projectStats: async (_, { projectId }) => {
            const datasets = db.datasets.filter((d) => d.projectId === projectId);
            const models = db.models.filter((m) => m.projectId === projectId);
            const predictions = db.predictions.filter((p) => models.some((m) => m.id === p.modelId));
            return {
                totalDatasets: datasets.length,
                totalModels: models.length,
                totalPredictions: predictions.length,
                lastActivity: new Date().toISOString()
            };
        },
        // Dataset Queries
        dataset: async (_, { id }) => {
            return db.datasets.find((d) => d.id === id);
        },
        datasets: async (_, { projectId, type, pagination }) => {
            let datasets = [...db.datasets];
            if (projectId) {
                datasets = datasets.filter((d) => d.projectId === projectId);
            }
            if (type) {
                datasets = datasets.filter((d) => d.type === type);
            }
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 10;
            const start = (page - 1) * limit;
            return {
                datasets: datasets.slice(start, start + limit),
                total: datasets.length,
                page,
                pages: Math.ceil(datasets.length / limit)
            };
        },
        // Model Queries
        model: async (_, { id }) => {
            return db.models.find((m) => m.id === id);
        },
        models: async (_, { projectId, type, status, pagination }) => {
            let models = [...db.models];
            if (projectId) {
                models = models.filter((m) => m.projectId === projectId);
            }
            if (type) {
                models = models.filter((m) => m.type === type);
            }
            if (status) {
                models = models.filter((m) => m.status === status);
            }
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 10;
            const start = (page - 1) * limit;
            return {
                models: models.slice(start, start + limit),
                total: models.length,
                page,
                pages: Math.ceil(models.length / limit)
            };
        },
        // Prediction Queries
        prediction: async (_, { id }) => {
            return db.predictions.find((p) => p.id === id);
        },
        predictions: async (_, { modelId, pagination }) => {
            let predictions = db.predictions.filter((p) => p.modelId === modelId);
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 10;
            const start = (page - 1) * limit;
            return predictions.slice(start, start + limit);
        },
        // Analytics Queries
        analytics: async (_, { startDate, endDate, projectId }) => {
            // Calculate analytics
            const overview = {
                totalUsers: db.users.length,
                totalProjects: db.projects.length,
                totalDatasets: db.datasets.length,
                totalModels: db.models.length,
                totalPredictions: db.predictions.length
            };
            // Mock trends data
            const trends = {
                daily: generateTrendData('daily', 7),
                weekly: generateTrendData('weekly', 4),
                monthly: generateTrendData('monthly', 6)
            };
            // Performance metrics
            const performance = {
                avgResponseTime: 150.5,
                avgAccuracy: 0.92,
                topModels: db.models.slice(0, 5),
                activeUsers: Math.floor(db.users.length * 0.6)
            };
            return { overview, trends, performance };
        },
        // Search
        search: async (_, { query, type }) => {
            const results = [];
            if (!type || type === 'User') {
                const users = db.users.filter((u) => u.username.includes(query) || u.email.includes(query));
                results.push(...users);
            }
            if (!type || type === 'Project') {
                const projects = db.projects.filter((p) => p.name.includes(query) || p.description?.includes(query));
                results.push(...projects);
            }
            if (!type || type === 'Dataset') {
                const datasets = db.datasets.filter((d) => d.name.includes(query));
                results.push(...datasets);
            }
            if (!type || type === 'Model') {
                const models = db.models.filter((m) => m.name.includes(query));
                results.push(...models);
            }
            return results;
        }
    },
    Mutation: {
        // Auth Mutations
        register: async (_, { input }) => {
            const hashedPassword = await bcrypt_1.default.hash(input.password, 10);
            const user = {
                id: String(db.users.length + 1),
                email: input.email,
                username: input.username,
                password: hashedPassword,
                role: input.role || 'USER',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            db.users.push(user);
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
            return { token, user };
        },
        login: async (_, { email, password }) => {
            const user = db.users.find((u) => u.email === email);
            if (!user) {
                throw new Error('User not found');
            }
            const valid = await bcrypt_1.default.compare(password, user.password);
            if (!valid) {
                throw new Error('Invalid password');
            }
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
            return { token, user };
        },
        logout: async () => {
            return { success: true, message: 'Logged out successfully' };
        },
        // Project Mutations
        createProject: async (_, { input }, context) => {
            if (!context.user)
                throw new Error('Not authenticated');
            const project = {
                id: String(db.projects.length + 1),
                name: input.name,
                description: input.description,
                status: input.status || 'DRAFT',
                userId: context.user.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            db.projects.push(project);
            // Publish subscription
            pubsub.publish('PROJECT_UPDATED', { projectUpdated: project });
            return project;
        },
        updateProject: async (_, { id, input }) => {
            const project = db.projects.find((p) => p.id === id);
            if (!project) {
                throw new Error('Project not found');
            }
            Object.assign(project, input, { updatedAt: new Date().toISOString() });
            pubsub.publish('PROJECT_UPDATED', { projectUpdated: project });
            return project;
        },
        deleteProject: async (_, { id }) => {
            const index = db.projects.findIndex((p) => p.id === id);
            if (index === -1) {
                throw new Error('Project not found');
            }
            db.projects.splice(index, 1);
            return { success: true, message: 'Project deleted successfully' };
        },
        // Model Mutations
        createModel: async (_, { input }) => {
            const model = {
                id: String(db.models.length + 1),
                name: input.name,
                type: input.type,
                status: 'TRAINING',
                projectId: input.projectId,
                parameters: input.parameters,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            db.models.push(model);
            return model;
        },
        trainModel: async (_, { input }) => {
            const model = db.models.find((m) => m.id === input.modelId);
            if (!model) {
                throw new Error('Model not found');
            }
            model.status = 'TRAINING';
            // Simulate training progress
            let epoch = 0;
            const totalEpochs = input.parameters?.epochs || 10;
            const interval = setInterval(() => {
                epoch++;
                const progress = {
                    modelId: model.id,
                    epoch,
                    totalEpochs,
                    loss: Math.random() * 0.5,
                    accuracy: 0.5 + (epoch / totalEpochs) * 0.4,
                    status: epoch < totalEpochs ? 'training' : 'completed'
                };
                pubsub.publish('MODEL_TRAINING_PROGRESS', {
                    modelTrainingProgress: progress
                });
                if (epoch >= totalEpochs) {
                    clearInterval(interval);
                    model.status = 'TRAINED';
                    model.accuracy = 0.9 + Math.random() * 0.09;
                    model.trainingTime = totalEpochs * 1000;
                    pubsub.publish('MODEL_STATUS_CHANGED', {
                        modelStatusChanged: model
                    });
                }
            }, 1000);
            return model;
        },
        predict: async (_, { input }) => {
            const model = db.models.find((m) => m.id === input.modelId);
            if (!model) {
                throw new Error('Model not found');
            }
            if (model.status !== 'TRAINED' && model.status !== 'DEPLOYED') {
                throw new Error('Model not ready for predictions');
            }
            const prediction = {
                id: String(db.predictions.length + 1),
                modelId: input.modelId,
                input: input.input,
                output: JSON.stringify({ result: Math.random() > 0.5 ? 'positive' : 'negative' }),
                confidence: 0.7 + Math.random() * 0.3,
                createdAt: new Date().toISOString()
            };
            db.predictions.push(prediction);
            pubsub.publish('NEW_PREDICTION', { newPrediction: prediction });
            return prediction;
        }
    },
    // Subscriptions (Disabled for now - requires graphql-ws setup)
    Subscription: {},
    // Field Resolvers
    User: {
        projects: (user) => db.projects.filter((p) => p.userId === user.id),
        profile: (user) => ({
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            bio: user.bio,
            location: user.location
        })
    },
    Project: {
        user: (project) => db.users.find((u) => u.id === project.userId),
        datasets: (project) => db.datasets.filter((d) => d.projectId === project.id),
        models: (project) => db.models.filter((m) => m.projectId === project.id),
        stats: (project) => {
            const datasets = db.datasets.filter((d) => d.projectId === project.id);
            const models = db.models.filter((m) => m.projectId === project.id);
            const predictions = db.predictions.filter((p) => models.some((m) => m.id === p.modelId));
            return {
                totalDatasets: datasets.length,
                totalModels: models.length,
                totalPredictions: predictions.length,
                lastActivity: new Date().toISOString()
            };
        }
    },
    Dataset: {
        project: (dataset) => db.projects.find((p) => p.id === dataset.projectId)
    },
    Model: {
        project: (model) => db.projects.find((p) => p.id === model.projectId),
        predictions: (model) => db.predictions.filter((p) => p.modelId === model.id)
    },
    Prediction: {
        model: (prediction) => db.models.find((m) => m.id === prediction.modelId)
    },
    SearchResult: {
        __resolveType(obj) {
            if (obj.email)
                return 'User';
            if (obj.datasets)
                return 'Project';
            if (obj.records)
                return 'Dataset';
            if (obj.accuracy)
                return 'Model';
            return null;
        }
    }
};
// Helper function to generate trend data
function generateTrendData(period, count) {
    const data = [];
    for (let i = 0; i < count; i++) {
        data.push({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            users: Math.floor(Math.random() * 100),
            projects: Math.floor(Math.random() * 50),
            predictions: Math.floor(Math.random() * 500)
        });
    }
    return data.reverse();
}
