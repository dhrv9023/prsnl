const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_V1 = `${API_BASE}/api/v1`;

async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail || "Request failed");
    }
    return res.json();
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${API_V1}${path}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
    });
    return handleResponse<T>(res);
}

export async function apiPost<T = unknown>(
    path: string,
    body: unknown
): Promise<T> {
    const res = await fetch(`${API_V1}${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
}

export async function apiPostForm<T = unknown>(
    path: string,
    formData: FormData
): Promise<T> {
    const res = await fetch(`${API_V1}${path}`, {
        method: "POST",
        credentials: "include",
        body: formData,
    });
    return handleResponse<T>(res);
}
