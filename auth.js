// auth.js - Shared Authentication Logic for Ethnic Vogue
const Auth = {
  token: localStorage.getItem('ev_token'),
  user: null,
  msg91Config: {
    widgetId: "366377643768393531303335", // Replace with actual widgetId from MSG91 dashboard
    tokenAuth: "", // Replace with actual widget token from MSG91 dashboard
    exposeMethods: true,
  },

  async init() {
    // Inject the modal structure immediately (hidden) so captcha div exists
    this._injectModal();

    // Fetch configuration from backend
    try {
        const configRes = await fetch('/api/config/msg91');
        const configData = await configRes.json();
        this.msg91Config = { ...this.msg91Config, ...configData };
    } catch (err) {
        console.error('Failed to fetch MSG91 config', err);
    }

    // Initialize MSG91 Widget
    this.initMSG91();

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
    
    const modalHtml = `
      <div id="auth-modal-container" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(5px); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:white; padding:40px; border-radius:8px; max-width:400px; width:90%; position:relative; box-shadow:0 20px 60px rgba(0,0,0,0.2);">
          <button onclick="Auth.hideLoginModal()" style="position:absolute; top:20px; right:20px; background:none; border:none; font-size:24px; cursor:pointer;">&times;</button>
          
          <div id="otp-step-1">
            <h2 style="font-family:'Cormorant Garamond', serif; font-size:32px; margin-bottom:10px;">Login / Sign Up</h2>
            <p style="color:#7A6F65; font-size:14px; margin-bottom:24px;">Enter your mobile number to receive an OTP.</p>
            <div style="margin-bottom:20px;">
              <label style="display:block; font-family:'DM Mono', monospace; font-size:10px; text-transform:uppercase; margin-bottom:8px;">Mobile Number</label>
              <input type="tel" id="login-mobile" placeholder="+91 98765 43210" style="width:100%; padding:14px; border:1px solid #D9C9B8; border-radius:4px; font-family:inherit;">
            </div>
            <div id="msg91-captcha" style="margin-bottom:20px; min-height: 50px;"></div>
            <button id="btn-send-otp" onclick="handleSendOTP()" style="width:100%; background:#2C2A28; color:white; padding:16px; border:none; border-radius:4px; font-family:'DM Mono', monospace; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer;">Get OTP</button>
          </div>

          <div id="otp-step-2" style="display:none;">
            <h2 style="font-family:'Cormorant Garamond', serif; font-size:32px; margin-bottom:10px;">Verify OTP</h2>
            <p style="color:#7A6F65; font-size:14px; margin-bottom:24px;">Enter the 6-digit code sent to your mobile.</p>
            <div style="margin-bottom:20px;">
              <label style="display:block; font-family:'DM Mono', monospace; font-size:10px; text-transform:uppercase; margin-bottom:8px;">One-Time Password</label>
              <input type="text" id="login-otp" placeholder="123456" maxlength="6" style="width:100%; padding:14px; border:1px solid #D9C9B8; border-radius:4px; font-family:inherit; text-align:center; letter-spacing:0.5em; font-weight:bold;">
            </div>
            <button id="btn-verify-otp" onclick="handleVerifyOTP()" style="width:100%; background:#2C2A28; color:white; padding:16px; border:none; border-radius:4px; font-family:'DM Mono', monospace; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer;">Verify & Login</button>
            <button onclick="document.getElementById('otp-step-1').style.display='block'; document.getElementById('otp-step-2').style.display='none';" style="width:100%; background:none; border:none; color:#C9A96E; margin-top:15px; font-size:12px; cursor:pointer;">Change Mobile Number</button>
          </div>
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
    if (window.initSendOTP) {
        this._setupWidget();
        return;
    }
    const script = document.createElement('script');
    script.src = "https://verify.msg91.com/otp-provider.js";
    script.onload = () => this._setupWidget();
    document.head.appendChild(script);
  },

  _setupWidget() {
    if (!this.msg91Config.tokenAuth) return;
    const configuration = {
      widgetId: this.msg91Config.widgetId,
      tokenAuth: this.msg91Config.tokenAuth,
      exposeMethods: true,
      captchaRenderId: 'msg91-captcha',
      success: (data) => {
          // Global success handler
          console.log('MSG91 Widget Global Success:', data);
      },
      failure: (error) => {
          // Global failure handler
          console.log('MSG91 Widget Global Failure:', error);
      }
    };
    try {
        window.initSendOTP(configuration);
    } catch (e) {
        console.error('MSG91 initSendOTP failed:', e);
    }
  },

  async requestOTP(mobile) {
    // Using MSG91 Widget sendOtp method
    return new Promise((resolve, reject) => {
        if (!window.sendOtp) return reject(new Error('MSG91 Widget not loaded'));
        
        // Mobile must contain country code without +
        let cleanMobile = mobile.replace(/\D/g, '');
        if (cleanMobile.length === 10) cleanMobile = '91' + cleanMobile;

        window.sendOtp(
            cleanMobile,
            (data) => resolve({ success: true, data }),
            (error) => resolve({ success: false, error: error.message || 'Failed to send OTP' })
        );
    });
  },

  async verifyOTP(mobile, otp) {
    // Using MSG91 Widget verifyOtp method
    return new Promise((resolve, reject) => {
        if (!window.verifyOtp) return reject(new Error('MSG91 Widget not loaded'));

        window.verifyOtp(
            otp,
            async (data) => {
                console.log('MSG91 Widget Verify Raw Result:', data);
                const finalToken = data.message || data;
                console.log('Sending token to backend:', finalToken.slice(0, 30) + '...');
                // Now notify our backend to create session/issue JWT
                try {
                    const response = await fetch('/api/auth/login-mobile-verified', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            verifiedData: finalToken 
                        })
                    });
                    const result = await response.json();
                    if (result.success) {
                        this.token = result.token;
                        this.user = result.user;
                        localStorage.setItem('ev_token', this.token);
                        this.onLogin(this.user);
                        resolve({ success: true });
                    } else {
                        resolve({ success: false, error: result.error });
                    }
                } catch (err) {
                    resolve({ success: false, error: 'Backend session failed' });
                }
            },
            (error) => resolve({ success: false, error: error.message || 'Invalid OTP' })
        );
    });
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

// Internal Modal Handlers
window.handleSendOTP = async () => {
    const mobile = document.getElementById('login-mobile').value;
    if (!mobile) return alert('Enter mobile number');
    
    const btn = document.getElementById('btn-send-otp');
    btn.disabled = true;
    btn.innerText = 'Sending...';
    
    try {
        const data = await Auth.requestOTP(mobile);
        if (data.success) {
            document.getElementById('otp-step-1').style.display = 'none';
            document.getElementById('otp-step-2').style.display = 'block';
            console.log('OTP requested successfully via MSG91 Widget.');
        } else {
            alert(data.error || 'Failed to send OTP');
            btn.disabled = false;
            btn.innerText = 'Get OTP';
        }
    } catch (err) {
        alert('Network error or Widget not ready');
        btn.disabled = false;
        btn.innerText = 'Get OTP';
    }
};

window.handleVerifyOTP = async () => {
    const mobile = document.getElementById('login-mobile').value;
    const otp = document.getElementById('login-otp').value;
    if (!otp) return alert('Enter OTP');
    
    const btn = document.getElementById('btn-verify-otp');
    btn.disabled = true;
    btn.innerText = 'Verifying...';
    
    try {
        const data = await Auth.verifyOTP(mobile, otp);
        if (data.success) {
            Auth.hideLoginModal();
            if (window.showToast) window.showToast('✓', 'Logged in successfully');
        } else {
            alert(data.error || 'Invalid OTP');
            btn.disabled = false;
            btn.innerText = 'Verify & Login';
        }
    } catch (err) {
        alert('Network error');
        btn.disabled = false;
        btn.innerText = 'Verify & Login';
    }
};

Auth.init();
window.Auth = Auth;
