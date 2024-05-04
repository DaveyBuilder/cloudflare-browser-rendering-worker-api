fetch('https://yourbrowserrenderworker.workers.dev', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		url: 'https://practicetestautomation.com/',
		instructions: [
			{ click: '#menu-item-20 a' },
			{ wait_for: 'a[href="https://practicetestautomation.com/practice-test-login/"]' },
			{ click: 'a[href="https://practicetestautomation.com/practice-test-login/"]' },
			{ wait_for: '#username' },
			{ scroll_x: 1000 },
			{ scroll_y: 1000 },
			{ fill: ['#username', 'student'] },
			{ fill: ['#password', 'Password123'] },
			{ click: '#submit' },
			{ wait_for: '.post-title' },
			{ key_name: '.post-title' },
			{
				evaluate: `document.body.innerHTML += '<div style="position: fixed; top: 10px; left: 10px; z-index: 10000; font-size: 48px; color: red; background-color: white; padding: 10px;">Evaluation Successful</div>';`,
			},
			{ wait: 1000 },
			{ screenshot: true },
		],
	}),
})
	.then((response) => {
		if (!response.ok) {
			throw new Error('Network response was not ok');
		}
		return response.json();
	})
	.then((text) => {
		console.log(JSON.stringify(text, null, 2));
	})
	.catch((error) => console.error('Error:', error));
