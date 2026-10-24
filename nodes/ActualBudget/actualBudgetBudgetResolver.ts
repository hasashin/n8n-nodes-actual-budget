export type ActualBudgetListItem = {
	id?: string;
	groupId?: string;
	cloudFileId?: string;
	encryptKeyId?: string | null;
	hasKey?: boolean;
	name?: string;
	state?: string;
};

export type ActualBudgetRuntime = {
	getBudgets(): Promise<ActualBudgetListItem[]>;
	downloadBudget(syncId: string, options?: { password?: string }): Promise<void>;
	loadBudget(budgetId: string): Promise<void>;
};

export function findBudgetEntry(
	budgets: ActualBudgetListItem[],
	budgetId?: string,
): ActualBudgetListItem | undefined {
	const normalizedBudgetId = (budgetId ?? '').trim();

	if (!normalizedBudgetId) {
		return (
			budgets.find((budget) => Boolean(budget?.id)) ??
			budgets.find((budget) => Boolean(budget?.groupId) || Boolean(budget?.cloudFileId))
		);
	}

	return budgets.find(
		(budget) =>
			budget?.id === normalizedBudgetId ||
			budget?.groupId === normalizedBudgetId ||
			budget?.cloudFileId === normalizedBudgetId,
	);
}

export async function resolveBudgetForUse(
	actual: ActualBudgetRuntime,
	budgetId?: string,
	budgetPassword?: string,
): Promise<string> {
	const budgets = await actual.getBudgets();
	const selectedBudget = findBudgetEntry(budgets, budgetId);
	if (!selectedBudget) {
		const target = (budgetId ?? '').trim() || 'the default budget';
		throw new Error(`No Actual budget matched "${target}".`);
	}

	const syncId = selectedBudget.groupId ?? selectedBudget.cloudFileId ?? selectedBudget.id;
	const requiresBudgetPassword = Boolean(selectedBudget.encryptKeyId) || selectedBudget.hasKey === false;

	if (requiresBudgetPassword) {
		const password = (budgetPassword ?? '').trim();
		if (!password) {
			throw new Error(
				'This Actual Budget is encrypted. Provide a budget password in the credential before running the operation.',
			);
		}
		if (!syncId) {
			throw new Error('This Actual Budget is encrypted, but no sync ID is available to load it.');
		}

		await actual.downloadBudget(syncId, { password });
		const refreshedBudgets = await actual.getBudgets();
		const refreshedBudget =
			findBudgetEntry(refreshedBudgets, selectedBudget.id ?? syncId) ??
			refreshedBudgets.find(
				(budget) => budget?.groupId === syncId || budget?.cloudFileId === syncId,
			);

		if (!refreshedBudget?.id) {
			throw new Error('The encrypted Actual Budget could not be opened after the provided password was accepted.');
		}

		return refreshedBudget.id;
	}

	if (selectedBudget.id) {
		await actual.loadBudget(selectedBudget.id);
		return selectedBudget.id;
	}

	if (!syncId) {
		throw new Error('No Actual budget ID was found for the selected budget.');
	}

	await actual.downloadBudget(syncId, budgetPassword ? { password: budgetPassword } : undefined);
	const refreshedBudgets = await actual.getBudgets();
	const refreshedBudget =
		findBudgetEntry(refreshedBudgets, syncId) ??
		refreshedBudgets.find((budget) => budget?.groupId === syncId || budget?.cloudFileId === syncId);

	if (!refreshedBudget?.id) {
		throw new Error('The selected Actual Budget could not be downloaded and opened.');
	}

	return refreshedBudget.id;
}
