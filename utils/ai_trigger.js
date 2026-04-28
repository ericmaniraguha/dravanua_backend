const redis = require("./redis");

/**
 * Triggers an AI processing task in the Celery worker.
 * @param {Object} data - The data to process.
 */
async function triggerAiTask(data) {
  const taskName = "tasks.ai_process_data";
  const taskId = require("crypto").randomUUID();
  
  const payload = {
    "body": Buffer.from(JSON.stringify([[data], {}, {"callbacks": null, "errbacks": null, "chain": null, "chord": null}])).toString('base64'),
    "content-encoding": "utf-8",
    "content-type": "application/json",
    "headers": {
      "lang": "py",
      "task": taskName,
      "id": taskId,
      "shadow": null,
      "eta": null,
      "expires": null,
      "group": null,
      "group_index": null,
      "retries": 0,
      "timelimit": [null, null],
      "root_id": taskId,
      "parent_id": null,
      "argsrepr": JSON.stringify([data]),
      "kwargsrepr": "{}",
      "origin": "node-backend"
    },
    "properties": {
      "correlation_id": taskId,
      "reply_to": taskId,
      "delivery_mode": 2,
      "delivery_info": {
        "exchange": "",
        "routing_key": "celery"
      },
      "priority": 0,
      "body_encoding": "base64",
      "delivery_tag": require("crypto").randomBytes(16).toString('hex')
    }
  };

  await redis.lpush("celery", JSON.stringify(payload));
  console.log(`🚀 Triggered AI task ${taskName} with ID ${taskId}`);
  return taskId;
}

module.exports = { triggerAiTask };
