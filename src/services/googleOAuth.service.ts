import axios from 'axios';
import {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
} from '@src/config/constants';

interface GoogleTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    token_type: 'Bearer';
    scope?: string;
}

interface GoogleUserResponse {
    sub: string;
    email: string;
    name: string;
    picture: string;
    email_verified: boolean;
    given_name?: string;
    family_name?: string;
    locale?: string;
    hd?: string; // Google Workspace domain
    aud?: string;
    iss?: string;
    iat?: number;
    exp?: number;
}
class GoogleOAuthService {
    private clientId: string | undefined;
    private clientSecret: string | undefined;
    private redirectUri: string | undefined;
    private tokenEndpoint: string;
    private userInfoEndpoint: string;

    constructor() {
        this.clientId = GOOGLE_CLIENT_ID;
        this.clientSecret = GOOGLE_CLIENT_SECRET;
        this.redirectUri = GOOGLE_REDIRECT_URI;
        this.tokenEndpoint = 'https://oauth2.googleapis.com/token';
        this.userInfoEndpoint =
            'https://openidconnect.googleapis.com/v1/userinfo';
    }

    getAuthorizationUrl(): string {
        const params = new URLSearchParams({
            client_id: this.clientId || '',
            redirect_uri: this.redirectUri || '',
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'offline',
            prompt: 'consent',
        });

        return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
    }

    async getAccessToken(code: string) {
        try {
            const decodedCode = decodeURIComponent(code);
            const body = new URLSearchParams({
                code: decodedCode,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: this.redirectUri,
                grant_type: 'authorization_code',
            } as Record<string, string>);
            const response = await axios.post<GoogleTokenResponse>(
                this.tokenEndpoint,
                body.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );
            return {
                accessToken: response.data.access_token,
                expiresIn: response.data.expires_in,
                refreshToken: response.data.refresh_token,
                tokenType: response.data.token_type,
            };
        } catch (error) {
            throw new Error('Failed to fetch access token');
        }
    }

    async getUserInfo(accessToken: string) {
        try {
            const response = await axios.get<GoogleUserResponse>(
                this.userInfoEndpoint,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            return {
                googleId: response.data.sub,
                email: response.data.email,
                username: response.data.name,
                picture: response.data.picture,
                verifiedEmail: response.data.email_verified,
            };
        } catch (error) {
            throw new Error('Failed to fetch user info');
        }
    }

    async refreshAccessToken(refreshToken: string) {
        try {
            const body = new URLSearchParams({
                client_id: this.clientId!,
                client_secret: this.clientSecret!,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            });
            const response = await axios.post(
                this.tokenEndpoint,
                body.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            return {
                accessToken: response.data.access_token,
                expiresIn: response.data.expires_in,
                refreshToken: response.data.refresh_token,
            };
        } catch (error) {
            throw new Error('Failed to refresh access token');
        }
    }

    async revokeToken(token: string) {
        try {
            const body = new URLSearchParams({
                token,
            });
            await axios.post(
                'https://oauth2.googleapis.com/revoke',
                body.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );
            return true;
        } catch (error) {
            return false;
        }
    }
}

const googleOAuthService = new GoogleOAuthService();

export default googleOAuthService;
