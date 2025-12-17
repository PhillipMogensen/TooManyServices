import yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { join } from 'path';

let cachedConfig = null;

export function loadConfig() {
	if (cachedConfig) {
		return cachedConfig;
	}

	try {
		const filePath = join(process.cwd(), '.config.yml');
		const content = readFileSync(filePath, 'utf8');
		cachedConfig = yaml.load(content) || {};
		return cachedConfig;
	} catch (error) {
		console.error('Error loading .config.yml:', error.message);
		return {};
	}
}

export function getDbtJobs() {
	const config = loadConfig();
	return config.dbt?.jobs || [];
}

export function getPrefectConfig() {
	const config = loadConfig();
	return {
		accountId: config.prefect?.accountId || '',
		workspaceId: config.prefect?.workspaceId || '',
		tags: config.prefect?.tags || []
	};
}

export function getLinks() {
	const config = loadConfig();
	return config.links || [];
}
