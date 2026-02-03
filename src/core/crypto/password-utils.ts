export function generateSecurePassword(length: number = 20): string {
	const charset =
		'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~';
	let retVal = '';
	const array = new Uint32Array(length);
	crypto.getRandomValues(array);
	for (let i = 0; i < length; i++) {
		retVal += charset.charAt(array[i] % charset.length);
	}
	array.fill(0);
	return retVal;
}
