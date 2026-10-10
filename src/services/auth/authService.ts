import { DEMO_USERS } from '../../mock/mockData';
import { Role, User } from '../../types';

const STORAGE_KEY = 'sts_eoc_auth_user_v1';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const DEMO_DEV_PASSWORD = 'demo-eoc-password';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 350));

    const normalizedEmail = credentials.email.trim().toLowerCase();
    const matchedUser = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    if (!matchedUser) {
      throw new Error(
        'Unrecognized operator email. Please select one of the authorized Demo EOC accounts below.'
      );
    }

    if (!credentials.password || credentials.password.trim().length < 4) {
      throw new Error('Please enter the development demo password (minimum 4 characters).');
    }

    const token = `demo-jwt-${matchedUser.role.toLowerCase()}-${Date.now()}`;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(matchedUser));
    } catch {
      // Ignore storage errors in restricted environments
    }

    return { user: matchedUser, token };
  },

  async loginByRole(role: Role): Promise<AuthResponse> {
    const matchedUser = DEMO_USERS.find((u) => u.role === role) || DEMO_USERS[0];
    return this.login({ email: matchedUser.email, password: DEMO_DEV_PASSWORD });
  },

  getCurrentUser(): User | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as User;
      }
    } catch {
      // Fallback
    }
    // Default to Inspector Ananya Sharma so preview loads directly into the Stitch console,
    // while supporting full logout/login at /login
    return DEMO_USERS[0];
  },

  logout(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  },

  getDemoAccounts(): User[] {
    return DEMO_USERS;
  },
};
