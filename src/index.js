import puppeteer from '@cloudflare/puppeteer';

export default {
	async fetch(request, env) {
		if (request.method !== 'POST') {
			return new Response(JSON.stringify({ message: 'This endpoint only accepts POST requests' }), {
				status: 405,
				headers: { 'content-type': 'application/json' },
			});
		}

		const requestData = await request.json();
		const url = requestData.url;

		if (!url) {
			return new Response(JSON.stringify({ message: 'Please provide a URL in the JSON body with a "url" key' }), {
				status: 400,
				headers: { 'content-type': 'application/json' },
			});
		}

		// Function to clean the key string used in the Cloudflare KV store (for saving screenshots)
		// So that the key name doesnt cause an issue with illgal characters
		function sanitizeKey(key) {
			return encodeURIComponent(key).replace(/[!*'()]/g, function (c) {
				return '%' + c.charCodeAt(0).toString(16);
			});
		}

		let errorsArray = [];
		let payload = [];

		try {
			const normalizedUrl = new URL(url).toString();

			const browser = await puppeteer.launch(env.MYBROWSER);
			const page = await browser.newPage();
			// await page.setUserAgent(
			// 	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
			// );
			await page.goto(normalizedUrl, { waitUntil: 'load' });
			await new Promise((r) => setTimeout(r, 1000));

			// Process each instruction from the POST request
			for (const instruction of requestData.instructions) {
				let actionDescription = 'default';
				try {
					if (instruction.click) {
						await page.click(instruction.click);
						actionDescription = `click-${instruction.click}`;
					}
					if (instruction.wait) {
						await new Promise((r) => setTimeout(r, instruction.wait));
						actionDescription = `wait-${instruction.wait}`;
					}
					if (instruction.wait_for) {
						await page.waitForSelector(instruction.wait_for);
						actionDescription = `wait_for-${instruction.wait_for}`;
					}
					if (instruction.scroll_x || instruction.scroll_y) {
						await page.evaluate(
							(x, y) => {
								window.scrollBy(x, y);
							},
							instruction.scroll_x || 0,
							instruction.scroll_y || 0
						);
						actionDescription = `scroll-${instruction.scroll_x || 0},${instruction.scroll_y || 0}`;
					}
					if (instruction.fill) {
						await page.type(instruction.fill[0], instruction.fill[1], { delay: 100 });
						actionDescription = `fill-${instruction.fill[0]}`;
					}
					if (instruction.evaluate) {
						await page.evaluate(instruction.evaluate);
						actionDescription = `evaluate`;
					}
					if (instruction.key_name) {
						const elementText = await page.evaluate((selector) => {
							const element = document.querySelector(selector);
							return element ? element.textContent : null;
						}, instruction.key_name);

						payload.push({ key: instruction.key_name, value: elementText });
						actionDescription = `key_name-${instruction.key_name}`;
					}
					if (instruction.screenshot) {
						const img = await page.screenshot();
						const timestamp = Date.now();
						const kvKey = `screenshot-${sanitizeKey(url)}-${timestamp}.jpg`;
						await env.BROWSER_RENDER_SCREENSHOTS.put(kvKey, img, {
							expirationTtl: 60 * 60 * 24,
						});
						actionDescription = `screenshot`;
					}
				} catch (error) {
					const errorDetail = `Failed on instruction: ${JSON.stringify(instruction)} with error: ${error.message}`;
					console.error(errorDetail);
					errorsArray.push(errorDetail);

					// Take a screenshot so the problem can be investigated
					const img = await page.screenshot();
					const timestamp = Date.now();
					const kvKey = `${sanitizeKey(actionDescription)}-${sanitizeKey(url)}-${timestamp}.jpg`;
					await env.BROWSER_RENDER_SCREENSHOTS.put(kvKey, img, {
						expirationTtl: 60 * 60 * 24,
					});
				}
			}

			await browser.close();

			let responseMessage = errorsArray.length > 0 ? 'Scraping completed with errors' : 'Scraping completed successfully';
			return new Response(JSON.stringify({ message: responseMessage, data: payload, errors: errorsArray }), {
				status: 200,
				headers: {
					'content-type': 'application/json',
				},
			});
		} catch (error) {
			return new Response(JSON.stringify({ message: `Failed to process the URL: ${error.message}` }), {
				status: 500,
				headers: { 'content-type': 'application/json' },
			});
		}
	},
};
