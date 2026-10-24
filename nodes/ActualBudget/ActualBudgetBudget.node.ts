import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { ensureBudgetLoaded, getActualClient, toN8nItems } from './actualBudgetHelpers';

const budgetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Get Budget Month', value: 'getBudgetMonth', action: 'Get a budget month' },
			{ name: 'Get Budget Months', value: 'getBudgetMonths', action: 'Get budget months' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many budgets' },
			{ name: 'Load', value: 'load', action: 'Load a budget' },
			{ name: 'Sync', value: 'sync', action: 'Sync a budget' },
		],
		default: 'getAll',
	},
];

const budgetFields: INodeProperties[] = [
	{
		displayName: 'Budget ID',
		name: 'budgetId',
		type: 'string',
		default: '',
		placeholder: 'budget ID',
		description: 'The ID of the Actual budget to use',
		displayOptions: {
			show: {
				operation: ['load', 'getBudgetMonth'],
			},
		},
	},
	{
		displayName: 'Month',
		name: 'month',
		type: 'string',
		default: '',
		placeholder: 'YYYY-MM',
		description: 'Budget month to retrieve',
		displayOptions: {
			show: {
				operation: ['getBudgetMonth'],
			},
		},
	},
];

export class ActualBudgetBudget implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Actual Budget Budget',
		name: 'actualBudgetBudget',
		icon: { light: 'file:actual-budget.svg', dark: 'file:actual-budget.svg' },
		subtitle: '={{$parameter["operation"]}}',
		group: ['transform'],
		version: [1],
		description: 'Manage budgets in Actual Budget.',
		defaults: {
			name: 'Actual Budget Budget',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'actualBudgetApi',
				required: true,
			},
		],
		properties: [...budgetOperations, ...budgetFields],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex, 'getAll') as string;
				const budgetId = (this.getNodeParameter('budgetId', itemIndex, '') as string).trim();
				const actualApi = await getActualClient(this);
				const activeBudgetId = operation === 'getAll' ? budgetId : await ensureBudgetLoaded(actualApi, budgetId);

				let response: unknown;
				switch (operation) {
					case 'getAll':
						response = await actualApi.getBudgets();
						break;
					case 'load':
						response = await actualApi.loadBudget(activeBudgetId);
						break;
					case 'sync':
						response = await actualApi.sync();
						break;
					case 'getBudgetMonths':
						response = await actualApi.getBudgetMonths();
						break;
					case 'getBudgetMonth': {
						const month = (this.getNodeParameter('month', itemIndex, '') as string).trim();
						if (!month) {
							throw new NodeOperationError(this.getNode(), 'A month is required for the Get Budget Month operation');
						}
						response = await actualApi.getBudgetMonth(month);
						break;
					}
					default:
						throw new NodeOperationError(this.getNode(), `Unsupported budget operation: ${operation}`);
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
