import puppeteer from '@cloudflare/puppeteer';

export default {
	async fetch(request, env) {
		if (request.method !== 'POST') {
			return new Response('This endpoint only accepts POST requests', { status: 405 });
		}

		const requestData = await request.json(); // Parse JSON body
		const url = requestData.url; // Extract URL from JSON body

		if (!url) {
			return new Response('Please provide a URL in the JSON body with a "url" key', { status: 400 });
		}

		try {
			const normalizedUrl = new URL(url).toString(); // Normalize the URL

			const browser = await puppeteer.launch(env.MYBROWSER);
			const page = await browser.newPage();
			await page.goto(normalizedUrl);
			const img = await page.screenshot();
			await env.BROWSER_KV_DEMO.put(url, img, {
				expirationTtl: 60 * 60 * 24,
			});
			await browser.close();

			return new Response(img, {
				headers: {
					'content-type': 'image/jpeg',
				},
			});
		} catch (error) {
			return new Response(`Failed to process the URL: ${error.message}`, { status: 500 });
		}
	},
};
