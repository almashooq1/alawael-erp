import * as math from 'mathjs';

/**
 * K-Means Clustering Model
 * Advanced data clustering for process segmentation
 */

interface ClusteringConfig {
  k: number; // Number of clusters
  maxIterations: number;
  tolerance: number;
  random?: boolean;
}

interface ClusterResult {
  clusters: number[][];
  centroids: number[][];
  labels: number[];
  iterations: number;
  inertia: number;
  silhouetteScore: number;
}

export class ClusteringModel {
  private config: ClusteringConfig;
  private centroids: number[][] = [];
  private labels: number[] = [];
  private iterations: number = 0;

  constructor(config: ClusteringConfig) {
    this.config = {
      k: 3,
      maxIterations: 100,
      tolerance: 0.0001,
      random: true,
      ...config,
    };
  }

  /**
   * Calculate Euclidean Distance
   */
  private euclideanDistance(point1: number[], point2: number[]): number {
    return Math.sqrt(
      point1.reduce((sum, val, idx) => sum + Math.pow(val - point2[idx], 2), 0)
    );
  }

  /**
   * Calculate Manhattan Distance
   */
  private manhattanDistance(point1: number[], point2: number[]): number {
    return point1.reduce((sum, val, idx) => sum + Math.abs(val - point2[idx]), 0);
  }

  /**
   * Initialize Centroids (K-means++)
   */
  private initializeCentroids(data: number[][]): number[][] {
    const centroids: number[][] = [];

    // First centroid randomly
    const firstIdx = Math.floor(Math.random() * data.length);
    centroids.push([...data[firstIdx]]);

    // Remaining centroids using K-means++
    for (let i = 1; i < this.config.k; i++) {
      const distances = data.map(point => {
        const minDist = Math.min(
          ...centroids.map(c => this.euclideanDistance(point, c))
        );
        return Math.pow(minDist, 2);
      });

      const totalDist = distances.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalDist;

      for (let j = 0; j < data.length; j++) {
        random -= distances[j];
        if (random <= 0) {
          centroids.push([...data[j]]);
          break;
        }
      }
    }

    return centroids;
  }

  /**
   * Assign Points to Nearest Centroid
   */
  private assignClusters(data: number[][]): number[] {
    return data.map(point =>
      this.centroids.reduce(
        (nearest, centroid, idx) => {
          const dist = this.euclideanDistance(point, centroid);
          return dist < this.euclideanDistance(point, this.centroids[nearest])
            ? idx
            : nearest;
        },
        0
      )
    );
  }

  /**
   * Update Centroids
   */
  private updateCentroids(data: number[][], labels: number[]): boolean {
    const newCentroids: number[][] = [];
    let changed = false;

    for (let i = 0; i < this.config.k; i++) {
      const clusterPoints = data.filter((_, idx) => labels[idx] === i);

      if (clusterPoints.length === 0) {
        newCentroids.push([...this.centroids[i]]);
        continue;
      }

      const numFeatures = data[0].length;
      const centroid: number[] = [];

      for (let j = 0; j < numFeatures; j++) {
        const mean = clusterPoints.reduce((sum, p) => sum + p[j], 0) / clusterPoints.length;
        centroid.push(mean);
      }

      const dist = this.euclideanDistance(centroid, this.centroids[i]);
      if (dist > this.config.tolerance) {
        changed = true;
      }

      newCentroids.push(centroid);
    }

    this.centroids = newCentroids;
    return changed;
  }

  /**
   * Calculate Inertia (Within-Cluster Sum of Squares)
   */
  private calculateInertia(data: number[][], labels: number[]): number {
    let inertia = 0;
    for (let i = 0; i < data.length; i++) {
      const dist = this.euclideanDistance(data[i], this.centroids[labels[i]]);
      inertia += Math.pow(dist, 2);
    }
    return inertia;
  }

  /**
   * Calculate Silhouette Score
   */
  private calculateSilhouetteScore(data: number[][], labels: number[]): number {
    let score = 0;
    let count = 0;

    for (let i = 0; i < data.length; i++) {
      const clusterLabel = labels[i];
      const clusterPoints = data.filter((_, idx) => labels[idx] === clusterLabel);

      // Average distance to points in same cluster
      const a =
        clusterPoints.reduce((sum, p) => sum + this.euclideanDistance(data[i], p), 0) /
        Math.max(1, clusterPoints.length - 1);

      // Minimum average distance to points in other clusters
      let b = Infinity;
      for (let k = 0; k < this.config.k; k++) {
        if (k !== clusterLabel) {
          const otherPoints = data.filter((_, idx) => labels[idx] === k);
          const avgDist =
            otherPoints.reduce((sum, p) => sum + this.euclideanDistance(data[i], p), 0) /
            Math.max(1, otherPoints.length);
          b = Math.min(b, avgDist);
        }
      }

      const s = (b - a) / Math.max(a, b);
      score += isNaN(s) ? 0 : s;
      count++;
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * Fit K-Means Model
   */
  fit(data: number[][]): ClusterResult {
    if (data.length === 0) {
      throw new Error('No data provided');
    }

    // Initialize
    this.centroids = this.initializeCentroids(data);
    this.iterations = 0;
    let previousInertia = Infinity;

    // Main loop
    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      this.iterations = iter + 1;

      // Assign clusters
      this.labels = this.assignClusters(data);

      // Calculate inertia
      const inertia = this.calculateInertia(data, this.labels);

      // Check convergence
      if (Math.abs(previousInertia - inertia) < this.config.tolerance) {
        console.log(`✓ Clustering converged at iteration ${this.iterations}`);
        break;
      }

      // Update centroids
      const changed = this.updateCentroids(data, this.labels);
      if (!changed) {
        console.log(`✓ Centroids stabilized at iteration ${this.iterations}`);
        break;
      }

      previousInertia = inertia;
    }

    // Generate clusters
    const clusters: number[][] = [];
    for (let i = 0; i < this.config.k; i++) {
      clusters.push(
        data
          .map((point, idx) => (this.labels[idx] === i ? idx : -1))
          .filter(idx => idx !== -1)
      );
    }

    const inertia = this.calculateInertia(data, this.labels);
    const silhouetteScore = this.calculateSilhouetteScore(data, this.labels);

    console.log(`✓ Clustering completed: ${this.iterations} iterations`);
    console.log(`  Inertia: ${inertia.toFixed(6)}`);
    console.log(`  Silhouette Score: ${silhouetteScore.toFixed(4)}`);

    return {
      clusters,
      centroids: this.centroids,
      labels: this.labels,
      iterations: this.iterations,
      inertia,
      silhouetteScore,
    };
  }

  /**
   * Predict Cluster for New Points
   */
  predict(data: number[][]): number[] {
    if (this.centroids.length === 0) {
      throw new Error('Model not fitted');
    }

    return data.map(point =>
      this.centroids.reduce((nearest, centroid, idx) => {
        const dist = this.euclideanDistance(point, centroid);
        return dist < this.euclideanDistance(point, this.centroids[nearest])
          ? idx
          : nearest;
      }, 0)
    );
  }

  /**
   * Determine Optimal Number of Clusters (Elbow Method)
   */
  static elbow(
    data: number[][],
    maxK: number = 10,
    maxIterations: number = 100
  ): { optimalK: number; inertias: number[] } {
    const inertias: number[] = [];

    for (let k = 1; k <= maxK; k++) {
      const model = new ClusteringModel({ k, maxIterations, tolerance: 0.0001 });
      const result = model.fit(data);
      inertias.push(result.inertia);
    }

    // Find elbow
    let maxGradient = 0;
    let elbowK = 1;

    for (let i = 1; i < inertias.length - 1; i++) {
      const gradient = Math.abs((inertias[i + 1] - inertias[i]) - (inertias[i] - inertias[i - 1]));
      if (gradient > maxGradient) {
        maxGradient = gradient;
        elbowK = i + 1;
      }
    }

    return { optimalK: elbowK, inertias };
  }

  /**
   * Get Cluster Summary
   */
  getClusterSummary(): object {
    return {
      k: this.config.k,
      iterations: this.iterations,
      centroids: this.centroids,
      clusterSizes: this.labels.reduce((acc: any, label) => {
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}

// Export factory function
export function createClusteringModel(config: Partial<ClusteringConfig> = {}) {
  return new ClusteringModel(config as ClusteringConfig);
}
