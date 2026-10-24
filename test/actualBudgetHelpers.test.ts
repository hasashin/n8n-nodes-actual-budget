import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveBudgetForUse } from '../nodes/ActualBudget/actualBudgetBudgetResolver.ts';

test('resolveBudgetForUse downloads a remote encrypted budget using the budget password before loading it', async () => {
	const calls: string[] = [];
	const actual = {
		getBudgets: async () => [{
			name: 'Protected Budget',
			groupId: 'sync-123',
			encryptKeyId: 'key-1',
			hasKey: false,
			id: 'budget-456',
		}],
		downloadBudget: async (syncId: string, options: { password?: string }) => {
			calls.push(`download:${syncId}:${options.password ?? ''}`);
			return undefined;
		},
		loadBudget: async (id: string) => {
			calls.push(`load:${id}`);
			return undefined;
		},
	};

	const result = await resolveBudgetForUse(actual as never, '', 'very-secret');

	assert.equal(result, 'budget-456');
	assert.deepEqual(calls, ['download:sync-123:very-secret']);
});

test('resolveBudgetForUse throws a clear error when a protected budget is selected without a budget password', async () => {
	const actual = {
		getBudgets: async () => [{
			name: 'Protected Budget',
			groupId: 'sync-123',
			encryptKeyId: 'key-1',
			hasKey: false,
			id: 'budget-456',
		}],
		downloadBudget: async () => undefined,
		loadBudget: async () => undefined,
	};

	await assert.rejects(
		() => resolveBudgetForUse(actual as never, '', ''),
		/This Actual Budget is encrypted/,
	);
});
