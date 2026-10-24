# n8n-nodes-actual-budget

This package adds Actual Budget support to n8n using the official `@actual-app/api` SDK. It exposes Actual budget data and management actions as n8n nodes, so you can automate account, transaction, payee, category, and budget workflows from your own self-hosted n8n installation.

## Cloud compatibility notice

This package is intended for self-hosted n8n environments only.

It is not compatible with n8n Cloud because it depends on the Actual Budget SDK and, in local mode, may require direct access to a local budget data directory. If you run n8n in the cloud, this node should not be expected to work unless you have a custom environment that explicitly supports the required runtime and filesystem access.

## What this node set can do

The package includes separate nodes for the main Actual Budget resources:

### Budget node
- Get all budgets
- Load a specific budget
- Sync a budget
- Get budget months
- Get a specific budget month

### Account node
- Get accounts
- Create an account
- Update an account
- Delete an account
- Get an account balance

### Transaction node
- Get transactions for an account and date range
- Create transactions
- Update a transaction
- Delete a transaction
- Import transactions
- Merge transactions

### Category node
- Get categories
- Set category budget amount for a month

### Payee node
- Get payees
- Create a payee
- Update a payee
- Delete a payee

These nodes are designed to work with the Actual Budget data model directly and are useful when you want to automate budget management, reconciliation, and reporting from n8n.

## Prerequisites outside n8n

Before using the node, make sure the Actual Budget backend is available to your self-hosted n8n runtime.

### Option 1: Actual Budget server mode
Use this if you are running an Actual Budget sync server or a remote Actual setup.

You need:
- the Actual server URL
- either a password or a session token
- a budget ID if you want to default to a specific budget

### Option 2: Local file mode
Use this if you are running Actual Budget locally and exposing its filesystem-backed data directory to the machine running n8n.

You need:
- the local filesystem path to the Actual data directory
- a n8n runtime that can read that directory
- the user account running n8n must have appropriate file permissions

## Installation

This package is meant to be installed in a self-hosted n8n environment, not in n8n Cloud.

### Typical installation flow
1. Download or clone this repository to the machine running your self-hosted n8n instance.
2. Install dependencies in the project folder:
   ```bash
   npm install
   ```
3. Build the package:
   ```bash
   npm run build
   ```
4. Install the package into your self-hosted n8n environment.
   
   If you are working from a local checkout, this usually means installing it from the repository path or publishing it to your private package source first.
5. Restart n8n so the new community nodes are loaded.

Example local-install pattern:
```bash
npm install /path/to/n8n-nodes-actual-budget
```

If your self-hosted n8n setup uses a custom node directory, copy or link the built package into the appropriate location as required by your installation method.

## Credentials

Create an `Actual Budget API` credential with one of the following configuration patterns:

- Server URL + password
- Server URL + session token
- Local data directory

The credential also supports an optional default Budget ID, which can reduce manual setup in workflows.

## Usage

Add the relevant Actual Budget node to a workflow and select the resource and operation you want to use.

Examples:
- Use the Budget node to load a budget and inspect monthly data
- Use the Account node to fetch balances or create new accounts
- Use the Transaction node to import or update transactions
- Use the Category node to set category allocations by month
- Use the Payee node to manage payees used in your Actual budgeting workflow

If a budget is specified in the credential or input fields, the node will load it before executing the action.

## Notes

- This package is built for automation in a self-hosted environment.
- It relies on the official Actual Budget API package and therefore requires the host environment to satisfy Actual’s runtime and filesystem requirements.
- It is not designed as a Cloud-safe n8n community package.

## References

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Actual Budget API docs](https://actualbudget.org/docs/api/)
- [Actual Budget project](https://actualbudget.org/)
- [n8n documentation](https://n8n.io/)
