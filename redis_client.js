import { createClient } from "redis";

export class RedisClient {
    client;

    constructor(url = 'redis://localhost:6379') {
        this.client = createClient({ url });

        this.client.on('connect', () => {
            console.log('Redis connected');
        });

        this.client.on('error', (err) => {
            console.error('Redis error:', err);
        });
    }

    /**
     * Connects to the Redis server if not already connected.
     * @returns {Promise<void>}
     */
    async connect() {
        if (!this.client.isOpen) {
            await this.client.connect();
        }
        return this;
    }

    async disconnect() {
        if (this.client.isOpen) {
            await this.client.quit();
            console.log('Redis disconnected');
        }
    }

    async set(key, value, expiryInSeconds = null) {
        const options = expiryInSeconds ? { EX: expiryInSeconds } : {};
        await this.client.set(key, JSON.stringify(value), options);
    }

    async get(key) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
    }

    async exists(key) {
        return await this.client.exists(key);
    }

    /**
     * Each each field value from found flat object
     * @param {string} key - Group Key
     * @param {string} id - Search Id
     * @param {string} field - Field key
     * @returns {Promise<String | null>}
     */
    async getEachField(key, id, field) {
        return await this.client.hGet(`${key}:${id}`, field);
    }

    async hset(key, id, obj) {
        await this.client.hSet(`${key}:${id}`, obj);
    }

    /**
     * Each each field value from found flat object
     * @param {string} key - Group Key
     * @param {string} id - Search Id
     * @returns {Promise<String | null>}
     */
    async getEach(key, id) {
        return await this.client.hGetAll(`${key}:${id}`);
    }
}