// Small fetch wrapper: JSON in/out, throws an Error whose message is the
// server's first error string (and whose `errors` holds all of them).
export class ApiError extends Error {
	constructor(status, errors) {
		super(errors[0] || "Something went wrong. Please try again.");
		this.status = status;
		this.errors = errors;
	}
}

async function request(method, path, body) {
	const options = { method, headers: { Accept: "application/json" }, credentials: "same-origin" };
	if (body !== undefined) {
		options.headers["Content-Type"] = "application/json";
		options.body = JSON.stringify(body);
	}

	let response;
	try {
		response = await fetch(`/api${path}`, options);
	} catch {
		throw new ApiError(0, ["Can't reach the server. Check your connection and try again."]);
	}

	if (response.status === 204) return null;
	const data = await response.json().catch(() => null);
	if (!response.ok) {
		const errors = Array.isArray(data?.errors) ? data.errors : [];
		throw new ApiError(response.status, errors);
	}
	return data;
}

export const api = {
	get: (path) => request("GET", path),
	post: (path, body = {}) => request("POST", path, body),
	patch: (path, body = {}) => request("PATCH", path, body),
	delete: (path) => request("DELETE", path),
};

export function queryString(params) {
	const query = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") query.set(key, value);
	});
	const str = query.toString();
	return str ? `?${str}` : "";
}
