/**
 * Offline Request Queue
 * طابور الطلبات في وضع عدم الاتصال
 *
 * Queues failed API requests when offline and replays them
 * when the connection is restored.
 */

const QUEUE_KEY = '__offline_queue__';
const MAX_QUEUE_SIZE = 50;

function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)));
  } catch {
    /* storage full — ignore */
  }
}

/**
 * Add a failed request to the offline queue.
 * @param {Object} config — Axios request config
 */
export function enqueueRequest(config) {
  const queue = getQueue();
  queue.push({
    url: config.url,
    method: config.method,
    data: config.data,
    headers: config.headers,
    timestamp: Date.now(),
  });
  saveQueue(queue);
}

/**
 * Replay queued requests using the provided apiClient.
 * @param {Function} apiFn — Async function that accepts a request config
 */
export async function replayQueue(apiFn) {
  const queue = getQueue();
  if (!queue.length) return { replayed: 0, failed: 0 };

  let replayed = 0;
  let failed = 0;

  for (const request of queue) {
    try {
      await apiFn(request);
      replayed++;
    } catch {
      failed++;
    }
  }

  saveQueue([]); // clear queue after replay attempt
  return { replayed, failed };
}

/**
 * Get current queue stats
 */
export function getQueueStats() {
  const queue = getQueue();
  return { size: queue.length, oldest: queue[0]?.timestamp || null };
}

export default { enqueueRequest, replayQueue, getQueueStats };
