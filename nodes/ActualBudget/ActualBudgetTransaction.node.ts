import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { ensureBudgetLoaded, getActualBudgetPassword, getActualClient, normalizeDate, toN8nItems } from './actualBudgetHelpers';

const transactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Create', value: 'create', action: 'Create a transaction' },
			{ name: 'Delete', value: 'delete', action: 'Delete a transaction' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many transactions' },
			{ name: 'Import', value: 'import', action: 'Import transactions' },
			{ name: 'Merge', value: 'merge', action: 'Merge transactions' },
			{ name: 'Update', value: 'update', action: 'Update a transaction' },
		],
		default: 'getAll',
	},
];

const transactionFields: INodeProperties[] = [
	{
		displayName: 'Budget ID',
		name: 'budgetId',
		type: 'string',
		default: '',
		placeholder: 'budget ID',
		description: 'Optional budget ID to load before transaction operations',
	},
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		default: '',
		placeholder: 'account ID',
		description: 'The Actual account ID used for the transaction operation',
		displayOptions: {
			show: {
				operation: ['getAll', 'create', 'import'],
			},
		},
	},
	{
		displayName: 'Transaction ID',
		name: 'transactionId',
		type: 'string',
		default: '',
		placeholder: 'transaction ID',
		description: 'The Actual transaction ID',
		displayOptions: {
			show: {
				operation: ['update', 'delete', 'merge'],
			},
		},
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Transactions JSON',
		name: 'transactionsJson',
		type: 'json',
		default: '[]',
		description: 'Array of transaction objects to create or import',
		displayOptions: {
			show: {
				operation: ['create', 'import'],
			},
		},
	},
	{
		displayName: 'Payload',
		name: 'payload',
		type: 'json',
		default: '{}',
		description: 'JSON data for update or merge operations',
		displayOptions: {
			show: {
				operation: ['update', 'merge'],
			},
		},
	},
];

export class ActualBudgetTransaction implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Actual Budget Transaction',
		name: 'actualBudgetTransaction',
		icon: { light: 'file:actual-budget.svg', dark: 'file:actual-budget.svg' },
		subtitle: '={{$parameter["operation"]}}',
		group: ['transform'],
		version: [1],
		description: 'Read, create, update, and delete transactions in Actual Budget.',
		defaults: {
			name: 'Actual Budget Transaction',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'actualBudgetApi', required: true }],
		properties: [...transactionOperations, ...transactionFields],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex, 'getAll') as string;
				const budgetId = (this.getNodeParameter('budgetId', itemIndex, '') as string).trim();
				const actualApi = await getActualClient(this);
				const budgetPassword = await getActualBudgetPassword(this);
				if (operation !== 'getAll') {
					await ensureBudgetLoaded(actualApi, budgetId || undefined, budgetPassword);
				}

				let response: unknown;
				switch (operation) {
					case 'getAll': {
						const accountId = (this.getNodeParameter('accountId', itemIndex, '') as string).trim();
						if (!accountId) {
							throw new NodeOperationError(this.getNode(), 'An Account ID is required to read transactions');
						}
						const startDate = normalizeDate(this.getNodeParameter('startDate', itemIndex, '') as string) ?? '';
						const endDate = normalizeDate(this.getNodeParameter('endDate', itemIndex, '') as string) ?? '';
						response = await actualApi.getTransactions(accountId, startDate, endDate);
						break;
					}
					case 'create': {
						const accountId = (this.getNodeParameter('accountId', itemIndex, '') as string).trim();
						if (!accountId) {
							throw new NodeOperationError(this.getNode(), 'An Account ID is required to add transactions');
						}
						const transactions = this.getNodeParameter('transactionsJson', itemIndex, '[]') as unknown;
						const values = Array.isArray(transactions) ? transactions : [transactions];
						response = await actualApi.addTransactions(accountId, values);
						break;
					}
					case 'update': {
						const transactionId = (this.getNodeParameter('transactionId', itemIndex, '') as string).trim();
						if (!transactionId) {
							throw new NodeOperationError(this.getNode(), 'A Transaction ID is required to update a transaction');
						}
						const payload = this.getNodeParameter('payload', itemIndex, '{}') as Record<string, unknown>;
						response = await actualApi.updateTransaction(transactionId, payload);
						break;
					}
					case 'delete': {
						const transactionId = (this.getNodeParameter('transactionId', itemIndex, '') as string).trim();
						if (!transactionId) {
							throw new NodeOperationError(this.getNode(), 'A Transaction ID is required to delete a transaction');
						}
						response = await actualApi.deleteTransaction(transactionId);
						break;
					}
					case 'import': {
						const accountId = (this.getNodeParameter('accountId', itemIndex, '') as string).trim();
						if (!accountId) {
							throw new NodeOperationError(this.getNode(), 'An Account ID is required to import transactions');
						}
						const transactions = this.getNodeParameter('transactionsJson', itemIndex, '[]') as unknown;
						const values = Array.isArray(transactions) ? transactions : [transactions];
						response = await actualApi.importTransactions(accountId, values);
						break;
					}
					case 'merge': {
						const transactionId = (this.getNodeParameter('transactionId', itemIndex, '') as string).trim();
						if (!transactionId) {
							throw new NodeOperationError(this.getNode(), 'A Transaction ID is required to merge transactions');
						}
						const payload = this.getNodeParameter('payload', itemIndex, '{}') as Record<string, unknown>;
						const targetId = payload.targetId as string | undefined;
						if (!targetId) {
							throw new NodeOperationError(this.getNode(), 'A target transaction ID is required to merge transactions');
						}
						response = await actualApi.mergeTransactions([transactionId, targetId]);
						break;
					}
					default:
						throw new NodeOperationError(this.getNode(), `Unsupported transaction operation: ${operation}`);
				}

				results.push(...toN8nItems(response));
			} catch (error) {
				if (this.continueOnFail()) {
					results.push({ json: { error: (error as Error).message }, pairedItem: itemIndex });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		}

		return [results];
	}
}
