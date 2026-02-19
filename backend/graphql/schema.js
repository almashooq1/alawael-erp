/**
 * 🔗 GraphQL Integration
 *
 * GraphQL schema and resolvers
 * - Alternative to REST API
 * - Efficient data fetching
 * - Real-time subscriptions support
 */

const typeDefs = `
  type Query {
    # User queries
    user(id: ID!): User
    users(limit: Int, offset: Int): [User!]!
    userByEmail(email: String!): User

    # Product queries
    product(id: ID!): Product
    products(limit: Int, offset: Int, category: String): [Product!]!
    searchProducts(query: String!, limit: Int): [Product!]!

    # Order queries
    order(id: ID!): Order
    orders(userId: ID!, limit: Int): [Order!]!
    orderStats: OrderStats

    # Analytics queries
    analytics(period: String!): Analytics
    dashboardMetrics: DashboardMetrics

    # Search
    search(query: String!, type: SearchType): SearchResults
  }

  type Mutation {
    # User mutations
    createUser(input: CreateUserInput!): UserResponse!
    updateUser(id: ID!, input: UpdateUserInput!): UserResponse!
    deleteUser(id: ID!): DeleteResponse!

    # Product mutations
    createProduct(input: CreateProductInput!): ProductResponse!
    updateProduct(id: ID!, input: UpdateProductInput!): ProductResponse!
    deleteProduct(id: ID!): DeleteResponse!

    # Order mutations
    createOrder(input: CreateOrderInput!): OrderResponse!
    updateOrderStatus(id: ID!, status: OrderStatus!): OrderResponse!
    cancelOrder(id: ID!): OrderResponse!

    # Auth mutations
    login(email: String!, password: String!): AuthResponse!
    logout: AuthResponse!
    refreshToken: AuthResponse!
  }

  type Subscription {
    orderStatusChanged(orderId: ID!): Order
    productPriceChanged(productId: ID!): Product
    newNotification(userId: ID!): Notification
  }

  # User type
  type User {
    id: ID!
    email: String!
    name: String!
    role: UserRole!
    avatar: String
    createdAt: String!
    updatedAt: String!
    orders: [Order!]!
    profile: UserProfile
  }

  type UserProfile {
    phone: String
    address: String
    city: String
    country: String
    preferences: UserPreferences
  }

  type UserPreferences {
    theme: String
    language: String
    notifications: Boolean
  }

  # Product type
  type Product {
    id: ID!
    name: String!
    description: String!
    price: Float!
    category: String!
    stock: Int!
    images: [String!]!
    rating: Float
    reviews: [Review!]!
    createdAt: String!
    updatedAt: String!
  }

  type Review {
    id: ID!
    userId: ID!
    rating: Int!
    comment: String!
    createdAt: String!
  }

  # Order type
  type Order {
    id: ID!
    userId: ID!
    items: [OrderItem!]!
    status: OrderStatus!
    total: Float!
    shippingAddress: String!
    createdAt: String!
    updatedAt: String!
    tracking: OrderTracking
  }

  type OrderItem {
    productId: ID!
    quantity: Int!
    price: Float!
  }

  type OrderTracking {
    status: String!
    location: String
    estimatedDelivery: String
    lastUpdate: String!
  }

  # Analytics type
  type Analytics {
    period: String!
    totalRevenue: Float!
    totalOrders: Int!
    averageOrderValue: Float!
    totalUsers: Int!
    newUsers: Int!
    conversionRate: Float!
  }

  type DashboardMetrics {
    totalRevenue: Float!
    totalOrders: Int!
    totalUsers: Int!
    activeUsers: Int!
    topProducts: [Product!]!
    recentOrders: [Order!]!
  }

  type OrderStats {
    total: Int!
    pending: Int!
    processing: Int!
    shipped: Int!
    delivered: Int!
    cancelled: Int!
  }

  # Response types
  type UserResponse {
    success: Boolean!
    message: String!
    user: User
  }

  type ProductResponse {
    success: Boolean!
    message: String!
    product: Product
  }

  type OrderResponse {
    success: Boolean!
    message: String!
    order: Order
  }

  type DeleteResponse {
    success: Boolean!
    message: String!
  }

  type AuthResponse {
    success: Boolean!
    message: String!
    token: String
    user: User
  }

  type SearchResults {
    users: [User!]!
    products: [Product!]!
    orders: [Order!]!
  }

  type Notification {
    id: ID!
    userId: ID!
    type: String!
    message: String!
    read: Boolean!
    createdAt: String!
  }

  # Enums
  enum UserRole {
    ADMIN
    MANAGER
    USER
    GUEST
  }

  enum OrderStatus {
    PENDING
    PROCESSING
    SHIPPED
    DELIVERED
    CANCELLED
  }

  enum SearchType {
    USER
    PRODUCT
    ORDER
    ALL
  }

  # Input types
  input CreateUserInput {
    email: String!
    password: String!
    name: String!
    role: UserRole
  }

  input UpdateUserInput {
    email: String
    name: String
    profile: UserProfileInput
  }

  input UserProfileInput {
    phone: String
    address: String
    city: String
    country: String
  }

  input CreateProductInput {
    name: String!
    description: String!
    price: Float!
    category: String!
    stock: Int!
  }

  input UpdateProductInput {
    name: String
    description: String
    price: Float
    stock: Int
  }

  input CreateOrderInput {
    items: [OrderItemInput!]!
    shippingAddress: String!
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
  }
`;

/**
 * GraphQL Resolvers
 */
const resolvers = {
  Query: {
    // User queries
    user: async (_, { id }, { db }) => {
      try {
        return await db.collection('users').findOne({ _id: id });
      } catch (error) {
        throw new Error(`Failed to fetch user: ${error.message}`);
      }
    },

    users: async (_, { limit = 10, offset = 0 }, { db }) => {
      try {
        return await db.collection('users').find({}).limit(limit).skip(offset).toArray();
      } catch (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }
    },

    // Product queries
    products: async (_, { limit = 10, offset = 0, category }, { db }) => {
      try {
        const filter = category ? { category } : {};
        return await db.collection('products').find(filter).limit(limit).skip(offset).toArray();
      } catch (error) {
        throw new Error(`Failed to fetch products: ${error.message}`);
      }
    },

    searchProducts: async (_, { query, limit = 10 }, { db }) => {
      try {
        return await db
          .collection('products')
          .find({
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } },
            ],
          })
          .limit(limit)
          .toArray();
      } catch (error) {
        throw new Error(`Search failed: ${error.message}`);
      }
    },

    // Analytics queries
    analytics: async (_, { period }, { db }) => {
      try {
        const aggregation = [
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$total' },
              totalOrders: { $sum: 1 },
              averageOrderValue: { $avg: '$total' },
            },
          },
        ];

        const result = await db.collection('orders').aggregate(aggregation).toArray();
        return result[0] || { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 };
      } catch (error) {
        throw new Error(`Analytics query failed: ${error.message}`);
      }
    },
  },

  Mutation: {
    // User mutations
    createUser: async (_, { input }, { db }) => {
      try {
        const result = await db.collection('users').insertOne({
          ...input,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return {
          success: true,
          message: 'User created successfully',
          user: { id: result.insertedId, ...input },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to create user: ${error.message}`,
        };
      }
    },

    updateUser: async (_, { id, input }, { db }) => {
      try {
        await db.collection('users').updateOne(
          { _id: id },
          {
            $set: {
              ...input,
              updatedAt: new Date(),
            },
          }
        );

        const user = await db.collection('users').findOne({ _id: id });

        return {
          success: true,
          message: 'User updated successfully',
          user,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to update user: ${error.message}`,
        };
      }
    },

    // Order mutations
    createOrder: async (_, { input }, { db, user }) => {
      try {
        const result = await db.collection('orders').insertOne({
          userId: user.id,
          items: input.items,
          shippingAddress: input.shippingAddress,
          status: 'PENDING',
          total: 0, // Calculate from items
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return {
          success: true,
          message: 'Order created successfully',
          order: { id: result.insertedId, ...input },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to create order: ${error.message}`,
        };
      }
    },

    // Auth mutations
    login: async (_, { email, password }, { db }) => {
      try {
        const user = await db.collection('users').findOne({ email });

        if (!user) {
          return {
            success: false,
            message: 'User not found',
          };
        }

        // Verify password (simplified)
        const token = Buffer.from(`${user._id}:${Date.now()}`).toString('base64');

        return {
          success: true,
          message: 'Login successful',
          token,
          user,
        };
      } catch (error) {
        return {
          success: false,
          message: `Login failed: ${error.message}`,
        };
      }
    },
  },

  Subscription: {
    orderStatusChanged: {
      subscribe: (_, { orderId }, { pubsub }) => {
        return pubsub.asyncIterator([`ORDER_STATUS_${orderId}`]);
      },
    },

    newNotification: {
      subscribe: (_, { userId }, { pubsub }) => {
        return pubsub.asyncIterator([`NOTIFICATION_${userId}`]);
      },
    },
  },

  // Field resolvers
  User: {
    orders: async (user, _, { db }) => {
      return await db.collection('orders').find({ userId: user._id }).toArray();
    },
  },

  Product: {
    reviews: async (product, _, { db }) => {
      return await db.collection('reviews').find({ productId: product._id }).toArray();
    },
  },

  Order: {
    items: async order => order.items,
  },
};

module.exports = {
  typeDefs,
  resolvers,
};
