import { requestUrl, RequestUrlParam } from "obsidian";

export interface AtelierSettings {
  apiUrl: string;
  email: string;
  password: string;
  syncFolder: string;
  autoSyncMinutes: number;
}

export const DEFAULT_SETTINGS: AtelierSettings = {
  apiUrl: "http://localhost:3001",
  email: "",
  password: "",
  syncFolder: "Atelier",
  autoSyncMinutes: 0,
};

export class AtelierAPI {
  private accessToken: string | null = null;
  private settings: AtelierSettings;

  constructor(settings: AtelierSettings) {
    this.settings = settings;
  }

  updateSettings(settings: AtelierSettings) {
    this.settings = settings;
  }

  private url(path: string): string {
    return `${this.settings.apiUrl}${path}`;
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    if (!this.accessToken) {
      await this.login();
    }
    try {
      return await this._doRequest(method, path, body);
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        await this.login();
        return await this._doRequest(method, path, body);
      }
      throw e;
    }
  }

  private async _doRequest(method: string, path: string, body?: any): Promise<any> {
    const params: RequestUrlParam = {
      url: this.url(path),
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
      },
    };
    if (body) {
      params.body = JSON.stringify(body);
    }
    const resp = await requestUrl(params);
    return resp.json;
  }

  async login(): Promise<boolean> {
    const resp = await requestUrl({
      url: this.url("/api/auth/login"),
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: this.settings.email,
        password: this.settings.password,
      }),
    });
    const data = resp.json;
    if (data.accessToken) {
      this.accessToken = data.accessToken;
      return true;
    }
    throw new Error("Login fehlgeschlagen");
  }

  async health(): Promise<any> {
    return await requestUrl({ url: this.url("/api/health") }).then((r) => r.json);
  }

  // Users
  async getUsers(): Promise<any[]> {
    return await this.request("GET", "/api/users");
  }

  async getMe(): Promise<any> {
    return await this.request("GET", "/api/auth/me");
  }

  // Scans
  async getAllScans(): Promise<any[]> {
    return await this.request("GET", "/api/scans");
  }

  async getMyScans(): Promise<any[]> {
    return await this.request("GET", "/api/scans/mine");
  }

  // Orders
  async getAllOrders(): Promise<any[]> {
    return await this.request("GET", "/api/orders/all");
  }

  async getMyOrders(): Promise<any[]> {
    return await this.request("GET", "/api/orders/mine");
  }

  // Shoes
  async getShoes(): Promise<any[]> {
    return await this.request("GET", "/api/shoes");
  }

  async getShoe(id: number): Promise<any> {
    return await this.request("GET", `/api/shoes/${id}`);
  }

  // Articles
  async getArticles(): Promise<any[]> {
    return await this.request("GET", "/api/articles");
  }

  async updateArticle(id: number, data: any): Promise<any> {
    return await this.request("PUT", `/api/articles/${id}`, data);
  }

  async createArticle(data: any): Promise<any> {
    return await this.request("POST", "/api/articles", data);
  }

  // FAQs
  async getFaqs(): Promise<any[]> {
    return await this.request("GET", "/api/faqs");
  }

  async updateFaq(id: number, data: any): Promise<any> {
    return await this.request("PUT", `/api/faqs/${id}`, data);
  }

  // Legal
  async getLegal(type: string): Promise<any> {
    return await this.request("GET", `/api/legal/${type}`);
  }

  // Favorites
  async getMyFavorites(): Promise<any[]> {
    return await this.request("GET", "/api/favorites/mine");
  }

  // Reviews
  async getReviews(shoeId: number): Promise<any[]> {
    return await this.request("GET", `/api/reviews/shoe/${shoeId}`);
  }

  // Loyalty
  async getLoyaltyTiers(): Promise<any[]> {
    return await this.request("GET", "/api/loyalty/tiers");
  }

  async getMyLoyaltyStatus(): Promise<any> {
    return await this.request("GET", "/api/loyalty/my-status");
  }

  // Curated
  async getCurated(): Promise<any[]> {
    return await this.request("GET", "/api/curated");
  }

  // Feedback
  async getAllFeedback(): Promise<any[]> {
    return await this.request("GET", "/api/feedback/all");
  }

  // Materials, Colors, Soles
  async getMaterials(): Promise<any[]> {
    return await this.request("GET", "/api/materials");
  }

  async getColors(): Promise<any[]> {
    return await this.request("GET", "/api/colors");
  }

  async getSoles(): Promise<any[]> {
    return await this.request("GET", "/api/soles");
  }

  // Settings
  async getBankSettings(): Promise<any> {
    return await this.request("GET", "/api/settings/bank");
  }
}
