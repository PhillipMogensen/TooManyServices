import yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { join } from 'path';

export function loadLinks() {
	try {
		const filePath = join(process.cwd(), 'links.yaml');
		const content = readFileSync(filePath, 'utf8');
		return yaml.load(content) || [];
	} catch (error) {
		console.error('Error loading links.yaml:', error.message);
		return [];
	}
}
