import { complianceTestsAsync } from "@konceiver/kv-test-suite";
import { StoreAsync } from "../src/async";

complianceTestsAsync(
	() =>
		StoreAsync.new<string, number>({
			collection: "ckvs",
			connection: "mongodb://127.0.0.1:27017",
		}),
	{
		1: 1,
		2: 2,
		3: 3,
		4: 4,
		5: 5,
	},
);
