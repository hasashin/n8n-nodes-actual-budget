import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { ensureBudgetLoaded, getActualClient, toN8nItems } from './actualBudgetHelpers';

const categoryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Get Many', value: 'getAll', action: 'Get many categories' },
			{ name: 'Set Budget Amount', value: 'setBudgetAmount', action: 'Set a category budget amount' },
		],
		default: 'getAll',
	},
];

const categoryFields: INodeProperties[] = [
	{
		displayName: 'Budget ID',
		name: 'budgetId',
		type: 'string',
		default: '',
		placeholder: 'budget ID',
		description: 'Optional budget ID to load before category operations',
	},
	{
		displayName: 'Month',
		name: 'month',
		type: 'string',
		default: '',
		placeholder: 'YYYY-MM',
		description: 'Budget month to update',
		displayOptions: {
			show: {
				operation: ['setBudgetAmount'],
			},
		},
	},
	{
		displayName: 'Category ID',
		name: 'categoryId',
		type: 'string',
		default: '',
		placeholder: 'category ID',
		description: 'The category to update',
		displayOptions: {
			show: {
				operation: ['setBudgetAmount'],
			},
		},
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		default: 0,
		description: 'Category budget amount to set',
		displayOptions: {
			show: {
				operation: ['setBudgetAmount'],
			},
		},
	},
];

export class ActualBudgetCategory implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Actual Budget Category',
		name: 'actualBudgetCategory',
		icon: { light: 'file:actual-budget.svg', dark: 'file:actual-budget.svg' },
		subtitle: '={{$parameter["operation"]}}',
		group: ['transform'],
		version: [1],
		description: 'Read categories and manage category budget amounts in Actual Budget.',
		defaults: {
			name: 'Actual Budget Category',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'actualBudgetApi', required: true }],
		properties: [...categoryOperations, ...categoryFields],
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
						response = await actualApi.getCategories();
						break;
					case 'setBudgetAmount': {
						const month = (this.getNodeParameter('month', itemIndex, '') as string).trim();
						const categoryId = (this.getNodeParameter('categoryId', itemIndex, '') as string).trim();
						const amount = this.getNodeParameter('amount', itemIndex, 0) as number;
						if (!month || !categoryId) {
							throw new NodeOperationError(this.getNode(), 'Month and Category ID are required to set the budget amount');
						}
						response = await actualApi.setBudgetAmount(month, categoryId, amount);
						break;
					}
					default:
						throw new NodeOperationError(this.getNode(), `Unsupported category operation: ${operation}`);
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
