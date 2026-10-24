import * as Actual from '@actual-app/api';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export type ActualBudgetCredentials = {
	serverUrl?: string;
	password?: string;
	sessionToken?: string;
	dataDir?: string;
	budgetId?: string;
};

export async function getActualClient(executionContext: IExecuteFunctions): Promise<typeof Actual> {
	const credentials = (await executionContext.getCredentials('actualBudgetApi')) as ActualBudgetCredentials;
	const config: Record<string, string> = {};
	const serverUrl = credentials.serverUrl?.trim();
	const password = credentials.password?.trim();
	const sessionToken = credentials.sessionToken?.trim();
	const dataDir = credentials.dataDir?.trim();

	if (serverUrl) {
		config.serverURL = serverUrl;
		if (password) config.password = password;
		if (sessionToken) config.sessionToken = sessionToken;
	} else if (dataDir) {
		config.dataDir = dataDir;
	} else {
		throw new NodeOperationError(
			executionContext.getNode(),
			'Please provide a server URL or a local data directory in the Actual Budget credential.',
		);
	}

	await Actual.init(config);
	return Actual;
}

export async function ensureBudgetLoaded(actual: typeof Actual, budgetId?: string): Promise<string> {
	const budgets = await actual.getBudgets();
	const defaultBudgetId = budgetId?.trim() || budgets.find((budget: { id?: string } | null | undefined) => Boolean(budget?.id))?.id;

	if (!defaultBudgetId) {
		throw new Error('No Actual budgets were found. Create a budget before using this node.');
	}

	await actual.loadBudget(defaultBudgetId);
	return defaultBudgetId;
}

export function normalizeDate(dateValue: string | undefined): string | undefined {
	if (!dateValue) return undefined;
	if (typeof dateValue === 'string' && dateValue.includes('T')) {
		return dateValue.slice(0, 10);
	}
	return dateValue;
}

export function toN8nItems(payload: unknown): INodeExecutionData[] {
	if (Array.isArray(payload)) {
		return payload.map((value) => ({ json: value as IDataObject }));
	}
	if (payload !== null && typeof payload === 'object') {
		return [{ json: payload as IDataObject }];
	}
	return [{ json: { value: payload } as IDataObject }];
}
