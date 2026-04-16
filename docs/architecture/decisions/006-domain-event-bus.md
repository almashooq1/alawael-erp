# 6. Domain Event Bus for Cross-Context Integration

Date: 2026-04-16

## Status

✅ Accepted

## Context

The platform has 14 bounded contexts (see [blueprint/02-bounded-contexts.md](../../blueprint/02-bounded-contexts.md)). Contexts must exchange information without being coupled to each other's internal schemas or databases. Examples:

- `SessionCompleted` (BC-04) must trigger invoicing (BC-06), parent notification (BC-11), and KPI update (BC-13).
- `IRPApproved` (BC-04) must auto-schedule initial sessions (BC-05).
- `IncidentReported` (BC-08) must alert supervisors (BC-11) and update risk dashboards (BC-13).

Choosing synchronous cross-service calls would create brittle coupling, unpredictable latency, and cascading failures.

## Decision

We adopt an **in-process domain event bus backed by a durable message queue** with these characteristics:

1. **Publisher = Aggregate:** Each bounded context publishes events after a successful transaction.
2. **Subscribers = Handlers:** Other contexts subscribe to event types they care about. Handlers are idempotent and rerunnable.
3. **Durable:** Events persist to `EventStore` (MongoDB-backed) before subscribers run, so a consumer crash does not lose events.
4. **Ordering:** Events within a single aggregate are FIFO; cross-aggregate ordering is not guaranteed (handlers must be commutative or include `correlationId`/`causationId` to reconstruct saga order).
5. **Schema:** Every event conforms to the canonical envelope in [blueprint/04-data-domains.md](../../blueprint/04-data-domains.md) § 7.
6. **Transport:** In monolith, in-process emitter with after-commit hooks. In split deployment, NATS (existing dependency) or Redis Streams.
7. **Dead Letter Queue (DLQ):** Handler failures after N retries → DLQ + alert.
8. **Observability:** Each event emits a metric (count, latency) and can be traced via `correlationId`.

## Rules

- **No direct writes across bounded contexts.** If BC-06 needs to do X when BC-04 does Y, BC-04 emits `Y`, BC-06 reacts. No "BC-04 calls BC-06 API."
- **Read models are OK across contexts:** A context can maintain a denormalized read model updated from external events (e.g., `BeneficiarySummaryInFinance`).
- **Events are immutable facts.** Never edit; issue compensating event if needed (`InvoiceIssuedReversed`).
- **Name events in past tense** and include only facts necessary for consumers: `InvoicePaid`, not `PayInvoice`.
- **Versioning:** new fields are additive only. Breaking changes → new event name (`InvoicePaidV2`).

## Implementation

- Existing `backend/infrastructure/eventStore.js` and `messageQueue.js` become the backbone.
- Every aggregate's service file includes:
  ```js
  await transactionInsideContext();
  eventBus.publish({
    eventType: 'SessionCompleted',
    aggregateType: 'Session',
    aggregateId: session._id,
    branchId: session.branchId,
    payload: {...},
    correlationId, causationId,
  });
  ```
- Subscribers registered at boot in `startup/integration-bus-*.js`.

## Consequences

### Positive

- Contexts are loosely coupled and independently evolvable.
- Clear audit trail: every state change emits an event.
- Easy to add new subscribers without modifying publishers.
- Foundation for event-sourcing specific contexts (e.g., BC-06 in P4).

### Negative

- Eventual consistency between contexts.
- Need handler idempotency discipline.
- Debugging sagas requires correlation tooling.

### Risks

- Handler bugs cause silent data drift across contexts. Mitigation: integration tests per saga + monitoring dashboards for DLQ depth + weekly audit of "divergent reads" across contexts.

## References

- [docs/blueprint/02-bounded-contexts.md](../../blueprint/02-bounded-contexts.md)
- [docs/blueprint/06-workflows.md § 3 Saga Patterns](../../blueprint/06-workflows.md)
- `backend/infrastructure/eventStore.js`
- `backend/infrastructure/messageQueue.js`
