import "./zodExtensions.js";
import { RedisClient } from "./redis_client.js";
import { z } from "zod";

const SCHEMA_FIELD_TYPE = {
  TEXT: "TEXT",
  NUMERIC: "NUMERIC",
  TAG: "TAG"
};

function getRedisType(zodField) {
  if (zodField instanceof z.ZodString) return SCHEMA_FIELD_TYPE.TEXT;
  if (zodField instanceof z.ZodNumber) return SCHEMA_FIELD_TYPE.NUMERIC;
  if (zodField instanceof z.ZodBoolean) return SCHEMA_FIELD_TYPE.TAG;
  if (zodField instanceof z.ZodNull) return SCHEMA_FIELD_TYPE.TEXT;
  if (zodField instanceof z.ZodEnum) return SCHEMA_FIELD_TYPE.TAG;
  if (zodField instanceof z.ZodDate) return SCHEMA_FIELD_TYPE.TEXT;
  if (zodField instanceof z.ZodArray) return SCHEMA_FIELD_TYPE.TEXT;
  if (zodField instanceof z.ZodObject) return SCHEMA_FIELD_TYPE.TEXT;
  return "TEXT";
}

function generateRedisSchema(zodSchema, key) {
  const shape = zodSchema.shape;
  const schema = {};

  for (const key in shape) {
    const redisType = getRedisType(shape[key]);
    schema[`$.${key}`] = {
      type: redisType,
      AS: key
    }
    const zodDesc = zodSchema.shape[key]?._def?.describe
    if (zodDesc === "sortable" && (redisType === SCHEMA_FIELD_TYPE.NUMERIC || redisType === SCHEMA_FIELD_TYPE.TEXT)) {
      schema[`$.${key}`].SORTABLE = true;
    }
  }
  return schema;
}


export async function ZSchema(zodSchema, key) {
  const redisClient = new RedisClient("redis://default:Dmm0R15EgCPJcwG0NXzEj21rmOhNhzKy@redis-17946.c290.ap-northeast-1-2.ec2.redns.redis-cloud.com:17946");
  await redisClient.connect();
  const schema = generateRedisSchema(zodSchema, key);

  try {
    await redisClient.client.ft.DROPINDEX(`idx:${key}`);
  } catch (error) {
    console.log(error);
  }

  try {  
    await redisClient.client.ft.CREATE(`idx:${key}`, schema, {
      ON: 'JSON',
      PREFIX: `${key}:`,
      NGRAMS: { min: 1, max: 10 } 
    });
  } catch (error) { 
    console.log(error);
  }

  return class {
    constructor(data, id = undefined) {
      this.id = id;
      this.data = data;
      this._zodSchema = zodSchema;
      this.key = key;
    }

    /**
     * Saves ZSchema instance to Redis.
     *
     * @returns {Promise<void>} Resolves when all instances are saved.
     */
    async save() {
      const nextId = this.id ? this.id : await redisClient.client.incr(`${this.key}:id`);
      return redisClient.client.json.set(`${this.key}:${nextId}`, '$', this.data)
    }

    /**
     * Saves multiple ZSchema instances to Redis.
     *
     * @param {Array<InstanceType<ReturnType<typeof ZSchema>>>} datas - An array of ZSchema instances to save.
     * @returns {Promise<void>} Resolves when all instances are saved.
     */
    static async saveAll(datas) {
      try {
        const pipeline = redisClient.client.multi();

        for (const item of datas) {
          const nextId = item.id ? item.id : await redisClient.client.incr(`${key}:id`);
          pipeline.json.set(`${key}:${nextId}`, '$', item.data);
        }

        await pipeline.exec();
      } catch (error) {
        console.log(error);
      }
    }

    static async search(query = "*", options = {}) {
      try {
        let result = await redisClient.client.ft.search(`idx:${key}`, query, options);
        return result.documents.map(doc => doc);
      } catch (error) {
        console.log(error);
      }
    }
  };
}
