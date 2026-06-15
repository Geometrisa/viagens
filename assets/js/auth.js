"use strict";

// ============================================================
// SUPABASE AUTH
// ============================================================
const Auth = {
  client: null,
  _session: null,
  _user: null,
  _listeners: new Set(),
  _supabaseSubscription: null,

  async init() {
    if (this.client) return this;

    const config = window.GEOVIAGENS_CONFIG;
    if (!config?.supabaseUrl || !config?.supabasePublishableKey) {
      throw new Error("Configuração pública do Supabase ausente.");
    }
    if (!window.supabase?.createClient) {
      throw new Error("SDK do Supabase não foi carregado.");
    }

    this.client = window.supabase.createClient(
      config.supabaseUrl,
      config.supabasePublishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storageKey: "geoviagens-auth-v1",
        },
      },
    );

    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    this._setSession(data.session);

    const { data: subscriptionData } = this.client.auth.onAuthStateChange(
      (event, session) => {
        this._setSession(session);

        // Run application callbacks after Supabase finishes processing
        // the auth event, avoiding async work inside its callback.
        for (const listener of this._listeners) {
          setTimeout(() => {
            try {
              listener(event, session);
            } catch (listenerError) {
              console.error("Erro no listener de autenticação:", listenerError);
            }
          }, 0);
        }
      },
    );
    this._supabaseSubscription = subscriptionData.subscription;

    return this;
  },

  async getSession() {
    this._requireClient();
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    this._setSession(data.session);
    return data.session;
  },

  async getUser() {
    this._requireClient();
    if (!this._session) return null;

    const { data, error } = await this.client.auth.getUser();
    if (error) throw error;
    this._user = data.user || null;
    return this._user;
  },

  async signIn(email, password) {
    this._requireClient();

    const { data, error } = await this.client.auth.signInWithPassword({
      email: String(email || "").trim(),
      password: String(password || ""),
    });
    if (error) throw error;

    this._setSession(data.session);
    return data.session;
  },

  async signOut() {
    this._requireClient();
    const { error } = await this.client.auth.signOut();
    if (error) throw error;

    this._setSession(null);
  },

  onAuthStateChange(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("O callback de autenticação deve ser uma função.");
    }

    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  },

  _setSession(session) {
    this._session = session || null;
    this._user = session?.user || null;
  },

  _requireClient() {
    if (!this.client) {
      throw new Error("Auth.init() deve ser executado primeiro.");
    }
  },
};

window.Auth = Auth;
