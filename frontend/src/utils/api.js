// Leave this empty when the frontend and API share an origin (production), or
// set VITE_API_BASE_URL for a separately hosted API deployment.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

/**
 * Retrieve current JWT token from sessionStorage
 */
export const getToken = () => sessionStorage.getItem("token");

/**
 * Retrieve current user object from sessionStorage
 */
export const getCurrentUser = () => {
    try {
        const raw = sessionStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

/**
 * Centralized authenticated fetch wrapper
 * - Automatically attaches Authorization: Bearer <token>
 * - Formats JSON headers when appropriate (preserves FormData multipart boundaries)
 * - Resolves relative backend paths against API_BASE_URL
 */
export const authFetch = async (url, options = {}) => {
    const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
    const token = getToken();

    const headers = { ...options.headers };

    // Set JSON content-type if body is not FormData and content-type not explicitly specified
    if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    // Attach JWT Bearer Authorization header if token is stored
    if (token && !headers["Authorization"] && !headers["authorization"]) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(fullUrl, {
        ...options,
        headers
    });

    return response;
};

/**
 * Convenience API helper methods
 */
export const api = {
    get: (url, options = {}) => authFetch(url, { method: "GET", ...options }),
    post: (url, body, options = {}) => authFetch(url, {
        method: "POST",
        body: body instanceof FormData ? body : JSON.stringify(body),
        ...options
    }),
    put: (url, body, options = {}) => authFetch(url, {
        method: "PUT",
        body: body instanceof FormData ? body : JSON.stringify(body),
        ...options
    }),
    patch: (url, body, options = {}) => authFetch(url, {
        method: "PATCH",
        body: body instanceof FormData ? body : JSON.stringify(body),
        ...options
    }),
    delete: (url, options = {}) => authFetch(url, { method: "DELETE", ...options })
};

export default api;
