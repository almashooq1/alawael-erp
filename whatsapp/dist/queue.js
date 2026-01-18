"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueSend = enqueueSend;
exports.startQueueConsumer = startQueueConsumer;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const send_1 = require("./send");
const logger_1 = require("./infra/logger");
const BACKOFF_MS = [10000, 60000, 300000];
const MAX_RETRIES = BACKOFF_MS.length;
const QUEUE_MODE = (process.env.QUEUE_MODE || 'local').toLowerCase();
const QUEUE_URL = process.env.SQS_QUEUE_URL;
const USE_SQS = QUEUE_MODE === 'sqs' && !!QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const SQS_WAIT_TIME = Number(process.env.SQS_WAIT_TIME || 10);
const SQS_POLL_INTERVAL_MS = Number(process.env.SQS_POLL_INTERVAL_MS || 2000);
const sqs = USE_SQS ? new client_sqs_1.SQSClient({ region: AWS_REGION }) : undefined;
async function enqueueSend(payload, attempt = 0) {
    if (USE_SQS && sqs) {
        await sqs.send(new client_sqs_1.SendMessageCommand({ QueueUrl: QUEUE_URL, MessageBody: JSON.stringify(payload) }));
        logger_1.logger.info({ payload }, 'Enqueued to SQS');
        return;
    }
    try {
        await (0, send_1.sendAndPersist)(payload);
    }
    catch (err) {
        if (attempt >= MAX_RETRIES) {
            logger_1.logger.error({ err, payload }, 'Send failed permanently');
            return;
        }
        const delay = BACKOFF_MS[attempt] || BACKOFF_MS[BACKOFF_MS.length - 1];
        logger_1.logger.warn({ delay, attempt: attempt + 1, payload }, 'Send failed, retrying');
        setTimeout(() => {
            enqueueSend(payload, attempt + 1).catch((e) => logger_1.logger.error({ err: e, payload }, 'Retry failed'));
        }, delay);
    }
}
async function pollSqsOnce() {
    if (!USE_SQS || !sqs)
        return;
    const res = await sqs.send(new client_sqs_1.ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: SQS_WAIT_TIME,
    }));
    if (!res.Messages || res.Messages.length === 0)
        return;
    for (const msg of res.Messages) {
        if (!msg.Body || !msg.ReceiptHandle)
            continue;
        try {
            const payload = JSON.parse(msg.Body);
            await (0, send_1.sendAndPersist)(payload);
            await sqs.send(new client_sqs_1.DeleteMessageCommand({ QueueUrl: QUEUE_URL, ReceiptHandle: msg.ReceiptHandle }));
            logger_1.logger.info({ payload }, 'Sent and deleted from SQS');
        }
        catch (err) {
            logger_1.logger.error({ err, messageId: msg.MessageId }, 'Processing SQS message failed');
        }
    }
}
function startQueueConsumer() {
    if (!USE_SQS)
        return;
    const loop = async () => {
        try {
            await pollSqsOnce();
        }
        catch (err) {
            logger_1.logger.error({ err }, 'SQS poll failed');
        }
        finally {
            setTimeout(loop, SQS_POLL_INTERVAL_MS);
        }
    };
    loop();
    logger_1.logger.info({ queueUrl: QUEUE_URL, waitTime: SQS_WAIT_TIME, intervalMs: SQS_POLL_INTERVAL_MS }, 'SQS consumer started');
}
