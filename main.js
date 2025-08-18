import "./zodExtensions.js";
import { RedisClient } from "./redis_client.js";
import * as z from "zod";

const SCHEMA_FIELD_TYPE = {
  TEXT: "TEXT",
  NUMERIC: "NUMERIC",
  TAG: "TAG",
};

function getRedisType(zodField) {
  if (zodField instanceof z.ZodString) return SCHEMA_FIELD_TYPE.TEXT;
  if (zodField instanceof z.ZodNumber) return SCHEMA_FIELD_TYPE.NUMERIC;
  if (zodField instanceof z.ZodBoolean) return SCHEMA_FIELD_TYPE.NUMERIC;
  if (zodField instanceof z.ZodNull) return SCHEMA_FIELD_TYPE.TEXT;
  if (zodField instanceof z.ZodEnum) return SCHEMA_FIELD_TYPE.TAG;
  if (zodField instanceof z.ZodDate) return SCHEMA_FIELD_TYPE.TEXT;
  if (zodField instanceof z.ZodArray) return SCHEMA_FIELD_TYPE.TEXT;
  if (zodField instanceof z.ZodObject) return SCHEMA_FIELD_TYPE.TEXT;
  return "TEXT";
}

export async function ZSchema(zodSchema, key) {
  const redisClient = new RedisClient("redis://default:Dmm0R15EgCPJcwG0NXzEj21rmOhNhzKy@redis-17946.c290.ap-northeast-1-2.ec2.redns.redis-cloud.com:17946");
  await redisClient.connect();

  return class {
    constructor(data) {
      this.data = data;
      this._zodSchema = zodSchema;
      this.key = key;
    }

    static async generateSchema() {
      const shape = zodSchema.shape;
      const schema = {};

      for (const key in shape) {
        const redisType = getRedisType(shape[key]);
        console.log(redisType);
        schema[`$.${key}`] = {
          type: redisType,
          AS: key
        }
        const zodDesc = zodSchema.shape[key]?._def?.describe
        if (zodDesc === "sortable" && (redisType === SCHEMA_FIELD_TYPE.NUMERIC || redisType === SCHEMA_FIELD_TYPE.TEXT)) {
          schema[`$.${key}`].SORTABLE = true;
        }
      }

      try {
        await redisClient.client.ft.create(`idx:${key}`, schema, {
          ON: 'JSON',
          PREFIX: `${key}:`
        });
      } catch (error) {}

      return schema;
    }

    save() {
      console.log(JSON.stringify(this.data));
      console.log(JSON.stringify(this.generateSchema()));
    }

    /**
     * Saves multiple ZSchema instances to Redis.
     *
     * @param {Array<InstanceType<ReturnType<typeof ZSchema>>>} datas
     * @returns {Promise<void>}
     */
    static async saveAll(datas) {
      const pipeline = redisClient.client.multi();
      datas.forEach((item, i) => {
        pipeline.json.set(`${key}:${i}`, '$', item.data);
      });

      await pipeline.exec();
    }

    static async getAll() {
      let result = await redisClient.client.ft.search(`idx:${key}`, '*', {
        LIMIT: {
          from: 0,
          size: 10
        }
      });

      console.log(JSON.stringify(result, null, 2));
    }

  };
}

const Player = z.object({
  username: z.string().sortable(),
  xp: z.number()
});

const PlayerSchema = await ZSchema(Player, "Player")
await PlayerSchema.generateSchema();
const data = new PlayerSchema({ username: "test1", xp: 23 })
await PlayerSchema.saveAll([data])
await PlayerSchema.getAll()