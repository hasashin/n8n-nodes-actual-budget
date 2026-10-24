import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class ActualBudgetApi implements ICredentialType {
	name = 'actualBudgetApi';
	displayName = 'Actual Budget API';
	documentationUrl = 'https://actualbudget.org/docs/api/';
	icon = {
		light: 'file:../nodes/ActualBudget/actual-budget.svg',
		dark: 'file:../nodes/ActualBudget/actual-budget.svg',
	} as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Server URL',
			name: 'serverUrl',
			type: 'string',
			default: '',
			placeholder: 'https://actual.example.com',
			description: 'Base URL of your Actual Budget server. Leave blank for local file mode.',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Password used to authenticate against the Actual server.',
		},
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Optional session token for server-based auth. Use this instead of a password.',
		},
		{
			displayName: 'Data Directory',
			name: 'dataDir',
			type: 'string',
			default: '',
			placeholder: '/var/lib/actual',
			description: 'Advanced local-mode path for self-hosted n8n only. This is not intended for n8n Cloud.',
		},
		{
			displayName: 'Budget ID',
			name: 'budgetId',
			type: 'string',
			default: '',
			placeholder: 'budget-id',
			description: 'Optional budget ID to load automatically before running operations.',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.serverUrl}}',
			url: '/',
			method: 'GET',
			ignoreHttpStatusErrors: true,
		},
	};
}
