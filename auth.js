// auth.js - Shared Authentication Logic for Ethnic Vogue
const Auth = {
  token: localStorage.getItem('ev_token'),
  user: null,
  _widgetInitialized: false,
  msg91Config: {
    widgetId: "366377643768393531303335", // Replace with actual widgetId from MSG91 dashboard
    tokenAuth: "", // Replace with actual widget token from MSG91 dashboard
    exposeMethods: false,
  },

  async init() {
    // Inject the modal structure immediately (hidden)
    this._injectModal();

    // Fetch configuration from backend
    try {
        const configRes = await fetch('/api/config/msg91');
        const configData = await configRes.json();
        this.msg91Config = { ...this.msg91Config, ...configData };
    } catch (err) {
        console.error('Failed to fetch MSG91 config', err);
    }

    if (this.token) {
      try {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        if (response.ok) {
          this.user = await response.json();
          this.onLogin(this.user);
        } else {
          this.logout();
        }
      } catch (err) {
        console.error('Auth init failed', err);
        this.logout();
      }
    }
  },

  _injectModal() {
    if (document.getElementById('auth-modal-container')) return;
    
    // Captcha anchor lives OUTSIDE the modal, permanently in DOM to prevent re-mounting
    if (!document.getElementById('msg91-captcha')) {
        const captchaDiv = document.createElement('div');
        captchaDiv.id = 'msg91-captcha';
        captchaDiv.style.display = 'none';
        document.body.appendChild(captchaDiv);
    }

    const modalHtml = `
      <div id="auth-modal-container" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(5px); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:white; padding:40px; border-radius:8px; max-width:400px; width:90%; position:relative; box-shadow:0 20px 60px rgba(0,0,0,0.2);">
          <button onclick="Auth.hideLoginModal()" style="position:absolute; top:15px; right:20px; background:none; border:none; font-size:24px; cursor:pointer; z-index:1;">&times;</button>
          <h2 style="font-family:'Cormorant Garamond',serif; font-size:32px; margin-bottom:10px;">Login / Sign Up</h2>
          <p style="color:#7A6F65; font-size:14px; margin-bottom:24px;">Enter your mobile number to receive an OTP.</p>
          <!-- MSG91 widget renders its full UI here -->
          <div id="msg91-widget-container"></div>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.id = 'auth-modal-wrapper';
    container.innerHTML = modalHtml;
    document.body.appendChild(container);
  },

  showLoginModal() {
    const modal = document.getElementById('auth-modal-container');
    if (modal) modal.style.display = 'flex';
    
    // Initialize widget only when modal is shown
    this.initMSG91();
  },

  hideLoginModal() {
    const modal = document.getElementById('auth-modal-container');
    if (modal) modal.style.display = 'none';
  },

  initMSG91() {
    if (!this.msg91Config.tokenAuth) {
        console.warn('MSG91 Widget: tokenAuth is missing. Widget will not initialize. Please set MSG91_WIDGET_TOKEN in .env');
        return;
    }
    if (this._widgetInitialized) {
        console.log('MSG91 Widget already initialized, skipping.');
        return;
    }
    if (window.initSendOTP) {
        this._setupWidget();
        return;
    }

    // Use MSG91's recommended fallback loader
    const urls = [
        'https://verify.msg91.com/otp-provider.js',
        'https://verify.phone91.com/otp-provider.js'
    ];
    let i = 0;
    const attempt = () => {
        const s = document.createElement('script');
        s.src = urls[i];
        s.async = true;
        s.onload = () => {
            if (typeof window.initSendOTP === 'function') {
                this._setupWidget();
            }
        };
        s.onerror = () => {
            i++;
            if (i < urls.length) attempt();
            else console.error('MSG91 script failed to load from all URLs');
        };
        document.head.appendChild(s);
    };
    attempt();
  },

  _setupWidget() {
    if (this._widgetInitialized) return;
    if (!this.msg91Config.tokenAuth) return;
    
    const configuration = {
      widgetId: this.msg91Config.widgetId,
      tokenAuth: this.msg91Config.tokenAuth,
      exposeMethods: false, // Let the widget handle its own UI
      captchaRenderId: 'msg91-widget-container', // Render INTO the modal
      success: async (data) => {
          console.log('MSG91 Widget Success, token received:', data.message?.slice(0, 20) + '...');
          try {
              const response = await fetch('/api/auth/login-mobile-verified', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      verifiedData: data.message 
                  })
              });
              const result = await response.json();
              if (result.success) {
                  this.token = result.token;
                  this.user = result.user;
                  localStorage.setItem('ev_token', this.token);
                  this.onLogin(this.user);
                  this.hideLoginModal();
                  if (window.showToast) window.showToast('✓', 'Logged in successfully');
              } else {
                  console.error('Backend login failed:', result.error);
                  alert(result.error || 'Login failed');
              }
          } catch (err) {
              console.error('Backend error:', err);
              alert('Connection error during login');
          }
      },
      failure: (error) => {
          console.error('MSG91 Widget Global Failure:', error);
          // Optional: handle failure (e.g., reset widget)
      }
    };
    
    console.log('MSG91 Init Config:', { widgetId: configuration.widgetId, tokenAuth: configuration.tokenAuth });
    try {
        window.initSendOTP(configuration);
        this._widgetInitialized = true;
        console.log('MSG91 Widget initialized successfully.');
    } catch (e) {
        console.error('MSG91 initSendOTP failed:', e);
    }
  },

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('ev_token');
    window.location.reload();
  },

  onLogin(user) {
    console.log('User logged in:', user);
    // Trigger custom event for other scripts to listen to
    const event = new CustomEvent('auth:login', { detail: user });
    document.dispatchEvent(event);
  }
};

Auth.init();
window.Auth = Auth;
