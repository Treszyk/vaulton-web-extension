document.getElementById('testBtn').addEventListener('click', async () => {
	const statusDiv = document.getElementById('status');
	statusDiv.textContent = 'Connecting...';
	statusDiv.className = '';

	try {
		const response = await chrome.runtime.sendMessage({
			action: 'preRegister',
		});

		if (response.success) {
			statusDiv.textContent = `Success! Account ID: ${response.data.AccountId}`;
			statusDiv.className = 'success';
		} else {
			statusDiv.textContent = `Error: ${response.error}`;
			statusDiv.className = 'error';
		}
	} catch (err) {
		statusDiv.textContent = `Communication Error: ${err.message}`;
		statusDiv.className = 'error';
	}
});
