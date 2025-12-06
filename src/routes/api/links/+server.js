import { json } from '@sveltejs/kit';
import { loadLinks } from '$lib/links.js';

export async function GET() {
	const links = loadLinks();
	return json(links);
}
