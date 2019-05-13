// tslint:disable: no-unsafe-any
import { IKeyValueStoreAsync } from "@keeveestore/keeveestore";
import MongoDB from "mongojs";
import pify from "pify";

export class StoreAsync<K, T> implements IKeyValueStoreAsync<K, T> {
	private constructor(private readonly store: MongoDB, private readonly collection: MongoDB) {}

	public static async new<K, T>(opts: { connection: string; collection: string }): Promise<StoreAsync<K, T>> {
		const collection = MongoDB(opts.connection).collection(opts.collection);
		collection.createIndex(
			{ key: 1 },
			{
				background: true,
				unique: true,
			},
		);

		// tslint:disable-next-line: no-inferred-empty-object-type
		const store = ["update", "findOne", "remove", "count", "find"].reduce((mongo, method) => {
			mongo[method] = pify(collection[method].bind(collection));
			return mongo;
		},                                                                    {});

		return new StoreAsync<K, T>(store, collection);
	}

	public async all(): Promise<[K, T][]> {
		const documents = await this.store.find();

		return documents ? documents.map((document: { key: K; value: T }) => [document.key, document.value]) : [];
	}

	public async keys(): Promise<K[]> {
		const documents = await this.store.find();

		return documents ? documents.map((document: { key: K; value: T }) => document.key) : [];
	}

	public async values(): Promise<T[]> {
		const documents = await this.store.find();

		return documents ? documents.map((document: { key: K; value: T }) => document.value) : [];
	}

	public async get(key: K): Promise<T | undefined> {
		const document = await this.store.findOne({ key });

		return document ? document.value : undefined;
	}

	public async getMany(keys: K[]): Promise<(T | undefined)[]> {
		return Promise.all([...keys].map(async (key: K) => this.get(key)));
	}

	public async pull(key: K): Promise<T | undefined> {
		const item: T | undefined = await this.get(key);

		await this.forget(key);

		return item;
	}

	public async pullMany(keys: K[]): Promise<(T | undefined)[]> {
		const items: (T | undefined)[] = await this.getMany(keys);

		await this.forgetMany(keys);

		return items;
	}

	public async put(key: K, value: T): Promise<boolean> {
		await this.store.update({ key }, { key, value }, { upsert: true });

		return this.has(key);
	}

	public async putMany(values: [K, T][]): Promise<boolean[]> {
		return Promise.all(values.map(async (value: [K, T]) => this.put(value[0], value[1])));
	}

	public async has(key: K): Promise<boolean> {
		return (await this.get(key)) !== undefined;
	}

	public async hasMany(keys: K[]): Promise<boolean[]> {
		return Promise.all([...keys].map(async (key: K) => this.has(key)));
	}

	public async missing(key: K): Promise<boolean> {
		return !(await this.has(key));
	}

	public async missingMany(keys: K[]): Promise<boolean[]> {
		return Promise.all([...keys].map(async (key: K) => this.missing(key)));
	}

	public async forget(key: K): Promise<boolean> {
		if (await this.missing(key)) {
			return false;
		}

		await this.store.remove({ key });

		return this.missing(key);
	}

	public async forgetMany(keys: K[]): Promise<boolean[]> {
		return Promise.all([...keys].map((key: K) => this.forget(key)));
	}

	public async flush(): Promise<boolean> {
		await this.collection.remove();

		return this.isEmpty();
	}

	public async count(): Promise<number> {
		return this.store.count();
	}

	public async isEmpty(): Promise<boolean> {
		return (await this.count()) === 0;
	}

	public async isNotEmpty(): Promise<boolean> {
		return !(await this.isEmpty());
	}
}
