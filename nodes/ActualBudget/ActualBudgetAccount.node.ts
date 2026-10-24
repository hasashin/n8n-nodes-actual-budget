import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { ensureBudgetLoaded, getActualClient, toN8nItems } from './actualBudgetHelpers';

const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Get Many', value: 'getAll', action: 'Get many accounts' },
			{ name: 'Create', value: 'create', action: 'Create an account' },
			{ name: 'Update', value: 'update', action: 'Update an account' },
			{ name: 'Delete', value: 'delete', action: 'Delete an account' },
			{ name: 'Get Balance', value: 'getBalance', action: 'Get an account balance' },
		],
		default: 'getAll',
	},
];

const accountFields: INodeProperties[] = [
	{
		displayName: 'Budget ID',
		name: 'budgetId',
		type: 'string',
		default: '',
		placeholder: 'budget-ID',
		description: 'Optional budget ID to load before account operations',
	},
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		default: '',
		placeholder: 'account-ID',
		description: 'The Actual account ID',
		displayOptions: {
			show: {
				operation: ['update', 'delete', 'getBalance'],
			},
		},
	},
	{
		displayName: 'Payload',
		name: 'payload',
		type: 'json',
		default: '{}',
		description: 'JSON object with fields to create or update',
		displayOptions: {
			show: {
				operation: ['create', 'update'],
			},
		},
	},
];

export class ActualBudgetAccount implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Actual Budget Account',
		name: 'actualBudgetAccount',
		icon: { light: 'file:actual-budget.svg', dark: 'file:actual-budget.svg' },
		subtitle: '={{$parameter["operation"]}}',
		group: ['transform'],
		version: [1],
		description: 'Read and manage accounts in Actual Budget.',
		defaults: {
			name: 'Actual Budget Account',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'actualBudgetApi', required: true }],
		properties: [...accountOperations, ...accountFields],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex, 'getAll') as string;
				const budgetId = (this.getNodeParameter('budgetId', itemIndex, '') as string).trim();
				const actualApi = await getActualClient(this);
				if (operation !== 'getAll') {
					await ensureBudgetLoaded(actualApi, budgetId || undefined);
				}

				let response: unknown;
				switch (operation) {
					case 'getAll':
						response = await actualApi.getAccounts();
						break;
					case 'create': {
						const payload = this.getNodeParameter('payload', itemIndex, '{}') as Record<string, unknown>;
						response = await actualApi.createAccount(payload, 0);
						break;
					}
					case 'update': {
						const accountId = (this.getNodeParameter('accountId', itemIndex, '') as string).trim();
						if (!accountId) throw new Error('An Account ID is required to update an account.');
						const payload = this.getNodeParameter('payload', itemIndex, '{}') as Record<string, unknown>;
						response = await actualApi.updateAccount(accountId, payload);
						break;
					}
					case 'delete': {
						const accountId = (this.getNodeParameter('accountId', itemIndex, '') as string).trim();
						if (!accountId) throw new Error('An Account ID is required to delete an account.');
						response = await actualApi.deleteAccount(accountId);
						break;
					}
					case 'getBalance': {
						const accountId = (this.getNodeParameter('accountId', itemIndex, '') as string).trim();
						if (!accountId) throw new Error('An Account ID is required to get the account balance.');
						response = await actualApi.getAccountBalance(accountId, undefined);
						break;
					}
					default:
						throw new Error(`Unsupported account operation: ${operation}`);
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
