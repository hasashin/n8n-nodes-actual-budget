import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { ensureBudgetLoaded, getActualClient, toN8nItems } from './actualBudgetHelpers';

const payeeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Get Many', value: 'getAll', action: 'Get many payees' },
			{ name: 'Create', value: 'create', action: 'Create a payee' },
			{ name: 'Update', value: 'update', action: 'Update a payee' },
			{ name: 'Delete', value: 'delete', action: 'Delete a payee' },
		],
		default: 'getAll',
	},
];

const payeeFields: INodeProperties[] = [
	{
		displayName: 'Budget ID',
		name: 'budgetId',
		type: 'string',
		default: '',
		placeholder: 'budget-ID',
		description: 'Optional budget ID to load before payee operations',
	},
	{
		displayName: 'Payload',
		name: 'payload',
		type: 'json',
		default: '{}',
		description: 'JSON object with payee data',
		displayOptions: {
			show: {
				operation: ['create', 'update', 'delete'],
			},
		},
	},
];

export class ActualBudgetPayee implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Actual Budget Payee',
		name: 'actualBudgetPayee',
		icon: { light: 'file:actual-budget.svg', dark: 'file:actual-budget.svg' },
		subtitle: '={{$parameter["operation"]}}',
		group: ['transform'],
		version: [1],
		description: 'Read and manage payees in Actual Budget.',
		defaults: {
			name: 'Actual Budget Payee',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'actualBudgetApi', required: true }],
		properties: [...payeeOperations, ...payeeFields],
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
						response = await actualApi.getPayees();
						break;
					case 'create': {
						const payload = this.getNodeParameter('payload', itemIndex, '{}') as Record<string, unknown>;
						response = await actualApi.createPayee(payload);
						break;
					}
					case 'update': {
						const payload = this.getNodeParameter('payload', itemIndex, '{}') as Record<string, unknown>;
						const payeeId = payload.id as string | undefined;
						if (!payeeId) throw new Error('A Payee ID is required to update a payee.');
						response = await actualApi.updatePayee(payeeId, payload);
						break;
					}
					case 'delete': {
						const payload = this.getNodeParameter('payload', itemIndex, '{}') as Record<string, unknown>;
						const payeeId = payload.id as string | undefined;
						if (!payeeId) throw new Error('A Payee ID is required to delete a payee.');
						response = await actualApi.deletePayee(payeeId);
						break;
					}
					default:
						throw new Error(`Unsupported payee operation: ${operation}`);
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
