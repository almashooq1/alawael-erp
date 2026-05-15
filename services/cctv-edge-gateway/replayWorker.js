/**
 * replayWorker — drains the local queue back to central on a fixed timer.
 *
 * When central comes back after an outage, we want events that were
 * captured during the gap to flow up. The worker pops in small batches,
 * forwards each, and re-pushes anything that still fails.
 */
'use strict';

const queue = require('./queue');
const centralClient = require('./centralClient');
const log = require('./logger');

const TICK_MS = parseInt(process.env.REPLAY_TICK_MS, 10) || 10_000;
const BATCH = parseInt(process.env.REPLAY_BATCH, 10) || 20;

let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const ping = await centralClient.ping();
    if (!ping.reachable) {
      log.debug('[replay] central unreachable, skipping');
      return;
    }
    const items = await queue.pop(BATCH);
    if (items.length === 0) return;
    log.info(`[replay] draining ${items.length} queued items`);
    for (const item of items) {
      if (item.kind === 'event') {
        const r = await centralClient.forwardEvent(item.nvrCode, item.payload);
        if (!r.ok) {
          await queue.push(item);
        }
      } else if (item.kind === 'health') {
        const r = await centralClient.forwardHealth(item.payload);
        if (!r.ok) {
          await queue.push(item);
        }
      }
    }
  } catch (err) {
    log.warn(`[replay] tick error: ${err.message}`);
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  timer = setInterval(() => void tick(), TICK_MS);
  if (timer.unref) timer.unref();
  log.info(`[replay] worker started — every ${TICK_MS}ms, batch ${BATCH}`);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { start, stop, tick };
