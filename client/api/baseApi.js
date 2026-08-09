import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const client = axios.create({ baseURL });

function getAccessToken() {
    return localStorage.getItem('accessToken');
}

function setTokens(accessToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
    }
}

function clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
}

// attach the access token to every request
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let isRefreshing = false;

//  token logic
client.interceptors.response.use(
    function (response) {
        return response;
    },
    async function (error) {
        const originalRequest = error.config; // saving the details here for failed request
        const status = error.response ? error.response.status : null;

        if (status !== 401 || originalRequest._retried || isRefreshing) {
            return Promise.reject(error);
        }

        originalRequest._retried = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
            isRefreshing = false;
            clearTokens();
            window.location.href = '/login';
            return Promise.reject(error);
        }

        try {
            const response = await client.post('/auth/refresh', { refreshToken: refreshToken });
            const newAccessToken = response.data.accessToken;
            const newRefreshToken = response.data.refreshToken;

            setTokens(newAccessToken, newRefreshToken);

            originalRequest.headers.Authorization = 'Bearer ' + newAccessToken;
            isRefreshing = false;
            return client(originalRequest);

        } catch (refreshError) {
            isRefreshing = false;
            clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
        }
    }
);

export { setTokens, clearTokens, getAccessToken };