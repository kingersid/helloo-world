// auth.js - Shared Authentication Logic for Ethnic Vogue
const Auth = {
  token: localStorage.getItem('ev_token'),
  user: null,

  async init() {
    // Inject the modal structure immediately (hidden)
    this._injectModal();

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
          <button onclick="Auth.hideLoginModal()" style="position:absolute; top:15px; right:20px; background:none; border:none; font-size:24px; cursor:pointer; z-index:1;">&times;</button>
          <h2 style="font-family:'Cormorant Garamond',serif; font-size:32px; margin-bottom:10px;">Login / Sign Up</h2>
          <p id="auth-instruction" style="color:#7A6F65; font-size:14px; margin-bottom:24px;">Enter your mobile number to receive an OTP.</p>
          
          <div id="auth-step-1">
            <input type="tel" id="auth-mobile" placeholder="Mobile Number (10 digits)" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:4px; margin-bottom:16px; font-size:16px;">
            <button onclick="Auth.requestOTP()" style="width:100%; padding:12px; background:#2c3e50; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">Send OTP</button>
          </div>

          <div id="auth-step-2" style="display:none;">
            <input type="text" id="auth-otp" placeholder="6-digit OTP" maxlength="6" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:4px; margin-bottom:16px; font-size:16px; letter-spacing:4px; text-align:center;">
            <button id="verify-btn" onclick="Auth.verifyOTP()" style="width:100%; padding:12px; background:#2c3e50; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">Verify OTP</button>
            <p style="text-align:center; margin-top:16px; font-size:13px; color:#7A6F65;">Didn't receive? <a href="#" onclick="Auth.showStep(1)" style="color:#2c3e50; font-weight:600;">Change number</a></p>
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
    this.showStep(1);
  },

  hideLoginModal() {
    const modal = document.getElementById('auth-modal-container');
    if (modal) modal.style.display = 'none';
  },

  showStep(step) {
    document.getElementById('auth-step-1').style.display = step === 1 ? 'block' : 'none';
    document.getElementById('auth-step-2').style.display = step === 2 ? 'block' : 'none';
    const instr = document.getElementById('auth-instruction');
    if (step === 1) instr.innerText = 'Enter your mobile number to receive an OTP.';
    else instr.innerText = 'Enter the 6-digit code sent to your phone.';
  },

  async requestOTP() {
    const mobile = document.getElementById('auth-mobile').value;
    if (!mobile || mobile.length < 10) {
        alert('Please enter a valid 10-digit mobile number');
        return;
    }

    try {
        const res = await fetch('/api/auth/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile })
        });
        const data = await res.json();
        if (data.success) {
            this.showStep(2);
            if (data.mock && window.showToast) window.showToast('ℹ', 'Check server logs for mock OTP');
        } else {
            alert(data.error || 'Failed to send OTP');
        }
    } catch (err) {
        console.error('Request OTP Error:', err);
        alert('Connection error');
    }
  },

  async verifyOTP() {
    const mobile = document.getElementById('auth-mobile').value;
    const otp = document.getElementById('auth-otp').value;
    const btn = document.getElementById('verify-btn');

    if (!otp || otp.length !== 6) {
        alert('Please enter the 6-digit OTP');
        return;
    }

    btn.disabled = true;
    btn.innerText = 'Verifying...';

    try {
        const res = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile, otp })
        });
        const result = await res.json();
        if (result.success) {
            this.token = result.token;
            this.user = result.user;
            localStorage.setItem('ev_token', this.token);
            this.onLogin(this.user);
            this.hideLoginModal();
            if (window.showToast) window.showToast('✓', 'Logged in successfully');
        } else {
            alert(result.error || 'Invalid OTP');
        }
    } catch (err) {
        console.error('Verify OTP Error:', err);
        alert('Connection error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Verify OTP';
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
