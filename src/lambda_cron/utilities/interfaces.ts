//
export interface expressResponseType {
    status: number;
    headers?: any;
    type?: string | null;
    cache?: string;
    message?: string;
    data?: any;
}

export interface LoginResponse {
    status: number;
    url?: string;
    data?: any;
}

export interface LogoutResponse {
    status: number;
    url?: string;
    data?: any;
    cookie?: string;
}

export interface TokenResponse {
    status: number;
    cookie?: string;
    url?: string;
    data?: any;
}

export interface Credential {
    key: string;
    value: string;
    createdAt: string;
    updatedAt: string;
}
