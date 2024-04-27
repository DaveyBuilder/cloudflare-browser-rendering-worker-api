fetch('http://127.0.0.1:8787/', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
	},
	body: JSON.stringify({ url: 'https://www.printful.com/uk/api' }),
})
	.then((response) => response.blob()) // Assuming the response is an image
	.then((blob) => {
		const url = window.URL.createObjectURL(blob);
		console.log(url); // This URL can be used to view the image in a new tab
		// Optionally, you can create an image element and append it to the document to view it directly
		const img = document.createElement('img');
		img.src = url;
		document.body.appendChild(img);
	})
	.catch((error) => console.error('Error:', error));
