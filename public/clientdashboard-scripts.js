<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
  <title>Book Jeoan Gwyneth 🎀</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Lato:wght@300;400;700&family=Pinyon+Script&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="client-styles.css"/>
  <style>
    :root {
      --rose:#c94f6a; --rose-light:#e8728a; --rose-pale:#fce8ee;
      --rose-50:#fff0f4; --blush:#f7d6e0; --ribbon:#d45c78;
      --cream:#fff8fa; --border:#f0c8d4; --text:#3a1f28;
      --muted:#b08090; --mauve:#9a6070;
      --green:#1a7a50; --red:#c0392b;
      --cd-sidebar-w:220px;
      --shadow-sm:0 1px 4px rgba(201,79,106,.08);
      --shadow-md:0 4px 16px rgba(201,79,106,.14);
    }
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Lato',sans-serif;background:var(--cream);color:var(--text);}
    .cd-layout{display:flex;min-height:100vh;}

    /* SIDEBAR */
    .cd-sidebar{
      width:var(--cd-sidebar-w);min-height:100vh;flex-shrink:0;
      background:linear-gradient(180deg,var(--rose) 0%,var(--ribbon) 60%,#b84060 100%);
      display:flex;flex-direction:column;position:sticky;top:0;height:100vh;
      box-shadow:4px 0 20px rgba(201,79,106,.2);overflow-y:auto;
    }
    .cd-brand{padding:24px 20px 20px;border-bottom:1px solid rgba(255,255,255,.15);text-align:center;}
    .cd-brand-icon{font-size:28px;display:block;margin-bottom:6px;animation:cdSway 3s ease-in-out infinite;}
    @keyframes cdSway{0%,100%{transform:rotate(-7deg);}50%{transform:rotate(7deg);}}
    .cd-brand-name{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#fff;line-height:1.1;}
    .cd-brand-sub{font-size:9px;color:rgba(255,255,255,.6);letter-spacing:2px;text-transform:uppercase;margin-top:3px;}
    .cd-nav{flex:1;padding:14px 12px;display:flex;flex-direction:column;gap:3px;}
    .cd-nav-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.45);padding:0 8px;margin:10px 0 5px;}
    .cd-nav-item{
      display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:11px;
      color:rgba(255,255,255,.78);font-size:12px;font-family:'Lato',sans-serif;font-weight:400;
      text-decoration:none;cursor:pointer;border:none;background:none;width:100%;
      text-align:left;letter-spacing:.3px;transition:all .15s;
    }
    .cd-nav-item:hover{background:rgba(255,255,255,.15);color:#fff;}
    .cd-nav-item.active{background:rgba(255,255,255,.22);color:#fff;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.1);}
    .cd-nav-item .ni{font-size:15px;width:20px;text-align:center;flex-shrink:0;}
    .cd-sidebar-footer{padding:14px 12px;border-top:1px solid rgba(255,255,255,.15);}
    .cd-welcome{font-size:11px;color:rgba(255,255,255,.7);text-align:center;margin-bottom:8px;line-height:1.4;}
    .cd-welcome strong{color:#fff;display:block;font-size:12px;}
    .cd-signout{
      width:100%;padding:9px 12px;background:rgba(255,255,255,.12);
      border:1.5px solid rgba(255,255,255,.25);border-radius:10px;
      color:rgba(255,255,255,.85);font-family:'Lato',sans-serif;font-size:11px;
      letter-spacing:1px;cursor:pointer;transition:all .15s;text-transform:uppercase;
    }
    .cd-signout:hover{background:rgba(255,255,255,.22);color:#fff;}

    /* MAIN */
    .cd-main{flex:1;min-width:0;overflow-y:auto;display:flex;flex-direction:column;}
    .cd-page-header{background:#fff;border-bottom:1.5px solid var(--border);padding:18px 24px;position:sticky;top:0;z-index:50;}
    .cd-page-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--rose);line-height:1;margin-bottom:3px;}
    .cd-page-subtitle{font-size:11px;color:var(--muted);letter-spacing:.5px;}
    .cd-scroll{flex:1;overflow-y:auto;padding:18px 24px;display:flex;flex-direction:column;gap:10px;}
    .cd-empty{text-align:center;padding:60px 20px;color:var(--muted);}
    .cd-empty .cd-ei{font-size:44px;display:block;margin-bottom:12px;}
    .cd-empty p{font-size:14px;line-height:1.7;color:var(--mauve);}
    .cd-spinner-wrap{display:flex;align-items:center;justify-content:center;padding:60px 20px;}
    .cd-spinner{width:28px;height:28px;border:3px solid var(--rose-pale);border-top-color:var(--rose);border-radius:50%;animation:cdSpin .7s linear infinite;}
    @keyframes cdSpin{to{transform:rotate(360deg);}}

    /* STATUS BADGE */
    .status-badge{display:inline-block;padding:3px 10px;border-radius:100px;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;}
    .status-pending{background:#fff3cd;color:#856404;}
    .status-approved{background:#d1fae5;color:#065f46;}
    .status-declined{background:#fee2e2;color:#991b1b;}

    /* BOOKING CARD */
    .bk-card{background:#fff;border-radius:16px;padding:16px 18px;box-shadow:0 2px 10px rgba(201,79,106,.09);border:1.5px solid var(--border);margin-bottom:10px;}
    .bk-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
    .bk-card-name{font-family:'Playfair Display',serif;font-size:15px;color:var(--rose);font-weight:700;}
    .bk-card-body{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--mauve);}
    .bk-card-reason{margin-top:8px;padding:8px 10px;background:#fee2e2;border-radius:8px;color:#991b1b;font-size:11px;font-weight:700;}
    .bk-card-actions{display:flex;gap:8px;margin-top:12px;}
    .bk-btn-view{flex:1;padding:9px;background:var(--rose-50);border:1.5px solid var(--blush);border-radius:10px;color:var(--rose);font-family:'Lato',sans-serif;font-size:11px;font-weight:700;letter-spacing:.5px;cursor:pointer;transition:all .15s;}
    .bk-btn-view:hover{background:var(--blush);}
    .bk-btn-edit{flex:1;padding:9px;background:linear-gradient(135deg,var(--rose-light),var(--rose));border:none;border-radius:10px;color:#fff;font-family:'Lato',sans-serif;font-size:11px;font-weight:700;letter-spacing:.5px;cursor:pointer;box-shadow:0 3px 10px rgba(201,79,106,.25);transition:all .15s;}
    .bk-btn-edit:hover{transform:translateY(-1px);box-shadow:0 5px 14px rgba(201,79,106,.35);}
    .bk-screenshot{margin-top:10px;border-radius:10px;overflow:hidden;border:1.5px solid var(--border);}
    .bk-screenshot img{width:100%;display:block;cursor:pointer;transition:opacity .15s;}
    .bk-screenshot img:hover{opacity:.85;}
    .bk-ss-label{font-size:10px;color:var(--muted);padding:5px 8px;background:var(--rose-50);text-align:center;}

    /* IMAGE LIGHTBOX */
    .cd-lightbox{position:fixed;inset:0;background:rgba(20,5,10,.92);z-index:900;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .2s;}
    .cd-lightbox.show{opacity:1;pointer-events:all;}
    .cd-lightbox img{max-width:100%;max-height:90vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.6);}
    .cd-lightbox-close{position:absolute;top:16px;right:16px;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:22px;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}
    .cd-lightbox-close:hover{background:rgba(255,255,255,.3);}

    /* EDIT MODAL */
    .cd-edit-overlay{position:fixed;inset:0;background:rgba(58,31,40,.55);backdrop-filter:blur(6px);z-index:600;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s;}
    .cd-edit-overlay.show{opacity:1;pointer-events:all;}
    .cd-edit-box{background:#fff;border-radius:24px 24px 0 0;padding:26px 22px 32px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;transform:translateY(40px);transition:transform .3s cubic-bezier(.34,1.2,.64,1);border-top:3px solid var(--rose);}
    .cd-edit-overlay.show .cd-edit-box{transform:translateY(0);}
    .cd-edit-title{font-family:'Playfair Display',serif;font-size:18px;color:var(--rose);font-weight:700;margin-bottom:4px;}
    .cd-edit-sub{font-size:11px;color:var(--muted);margin-bottom:18px;}
    .cd-edit-field{margin-bottom:13px;}
    .cd-edit-field label{display:block;font-size:11px;font-weight:700;color:var(--mauve);letter-spacing:.5px;text-transform:uppercase;margin-bottom:5px;}
    .cd-edit-field input,.cd-edit-field textarea,.cd-edit-field select{
      width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;
      font-family:'Lato',sans-serif;font-size:13px;color:var(--text);background:#fff;
      transition:border-color .15s;outline:none;
    }
    .cd-edit-field input:focus,.cd-edit-field textarea:focus,.cd-edit-field select:focus{border-color:var(--rose);}
    .cd-edit-field textarea{resize:vertical;min-height:60px;}
    .cd-edit-ss-box{border:1.5px dashed var(--border);border-radius:12px;padding:14px;margin-bottom:13px;text-align:center;}
    .cd-edit-ss-box p{font-size:12px;color:var(--mauve);margin-bottom:10px;}
    .cd-edit-ss-preview{width:100%;border-radius:8px;margin-bottom:8px;display:none;}
    .cd-edit-ss-preview.show{display:block;}
    .cd-edit-upload-btn{padding:8px 16px;background:var(--rose-50);border:1.5px solid var(--blush);border-radius:8px;color:var(--rose);font-size:11px;font-weight:700;cursor:pointer;}
    .cd-edit-actions{display:flex;gap:10px;margin-top:18px;}
    .cd-edit-btn-cancel{flex:1;padding:12px;background:var(--rose-50);border:1.5px solid var(--blush);border-radius:12px;color:var(--mauve);font-family:'Lato',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;}
    .cd-edit-btn-cancel:hover{background:var(--blush);}
    .cd-edit-btn-submit{flex:2;padding:12px;background:linear-gradient(135deg,var(--rose-light),var(--rose));border:none;border-radius:12px;color:#fff;font-family:'Lato',sans-serif;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(201,79,106,.3);transition:all .15s;}
    .cd-edit-btn-submit:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(201,79,106,.4);}
    .cd-edit-btn-submit:disabled{opacity:.6;transform:none;cursor:not-allowed;}
    .cd-edit-error{font-size:12px;color:var(--red);margin-top:8px;display:none;}
    .cd-edit-error.show{display:block;}

    /* TOAST */
    .cd-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);background:var(--text);color:#fff;border-radius:100px;padding:11px 24px;font-size:13px;z-index:999;transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .3s;opacity:0;pointer-events:none;white-space:nowrap;box-shadow:0 8px 24px rgba(58,31,40,.3);}
    .cd-toast.show{transform:translateX(-50%) translateY(0);opacity:1;}

    /* MODALS */
    .cd-modal-overlay{position:fixed;inset:0;background:rgba(58,31,40,.5);backdrop-filter:blur(6px);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .25s;}
    .cd-modal-overlay.show{opacity:1;pointer-events:all;}
    .cd-modal-box{background:#fff;border-radius:24px;padding:32px 28px 26px;max-width:300px;width:100%;text-align:center;box-shadow:0 24px 60px rgba(201,79,106,.28);transform:scale(.9) translateY(12px);transition:transform .3s cubic-bezier(.34,1.56,.64,1);border:1.5px solid var(--blush);}
    .cd-modal-overlay.show .cd-modal-box{transform:scale(1) translateY(0);}
    .cd-modal-icon{font-size:38px;display:block;margin-bottom:10px;animation:cdSway 3s ease-in-out infinite;}
    .cd-modal-title{font-family:'Playfair Display',serif;font-size:19px;color:var(--rose);margin-bottom:7px;font-weight:700;}
    .cd-modal-msg{font-size:13px;color:var(--mauve);line-height:1.65;margin-bottom:20px;}
    .cd-modal-actions{display:flex;gap:8px;}
    .cd-modal-btn-cancel{flex:1;padding:11px;background:var(--rose-50);border:1.5px solid var(--blush);border-radius:11px;color:var(--mauve);font-family:'Lato',sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:all .15s;}
    .cd-modal-btn-cancel:hover{background:var(--blush);}
    .cd-modal-btn-confirm{flex:1;padding:11px;background:linear-gradient(135deg,var(--rose-light),var(--rose));border:none;border-radius:11px;color:#fff;font-family:'Lato',sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;box-shadow:0 4px 14px rgba(201,79,106,.3);transition:all .15s;}
    .cd-modal-btn-confirm:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(201,79,106,.4);}

    /* HAMBURGER */
    .cd-hamburger{display:none;position:fixed;top:14px;left:14px;z-index:300;background:var(--rose);border:none;border-radius:10px;width:40px;height:40px;cursor:pointer;font-size:20px;color:#fff;box-shadow:var(--shadow-md);transition:background .15s;align-items:center;justify-content:center;line-height:1;}
    .cd-hamburger:hover{background:var(--rose-light);}
    .cd-sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(58,31,40,.45);backdrop-filter:blur(3px);z-index:149;}
    .cd-sidebar-overlay.show{display:block;}

    /* MOBILE */
    @media(max-width:768px){
      .cd-hamburger{display:flex;}
      .cd-sidebar{position:fixed!important;top:0!important;left:0!important;width:240px!important;height:100vh!important;min-height:100vh!important;z-index:200;transform:translateX(-100%);transition:transform .32s cubic-bezier(.34,1.2,.64,1);flex-direction:column!important;overflow-y:auto;}
      .cd-sidebar.open{transform:translateX(0);}
      .cd-brand{display:flex!important;flex-direction:column;align-items:center;}
      .cd-nav{flex-direction:column!important;overflow-x:unset!important;align-items:stretch!important;padding:14px 12px!important;}
      .cd-nav-label{display:block!important;}
      .cd-nav-item{flex-direction:row!important;font-size:13px!important;padding:11px 14px!important;border-radius:11px!important;min-width:unset!important;justify-content:flex-start!important;align-items:center!important;gap:9px!important;}
      .cd-nav-item .ni{font-size:16px!important;width:20px!important;}
      .cd-welcome{display:block!important;}
      .cd-sidebar-footer{border-left:none!important;border-top:1px solid rgba(255,255,255,.15)!important;padding:14px 12px!important;}
      .cd-main{padding-top:60px;}
      .cd-page-header{top:60px;}
      .cd-edit-box{border-radius:24px 24px 0 0;}
    }
  </style>
</head>
<body>

<button class="cd-hamburger" id="cdHamburger" onclick="toggleSidebar()">☰</button>
<div class="cd-sidebar-overlay" id="cdSidebarOverlay" onclick="closeSidebar()"></div>

<div id="dashPage">
  <div class="cd-layout">
    <aside class="cd-sidebar" id="cdSidebar">
      <div class="cd-brand">
        <span class="cd-brand-icon">🎀</span>
        <div class="cd-brand-name">Jeoan Gwyneth</div>
        <div class="cd-brand-sub">Client Portal</div>
      </div>
      <nav class="cd-nav">
        <div class="cd-nav-label">Menu</div>
        <a class="cd-nav-item active" id="navBooking" onclick="showTab('booking');closeSidebar();">
          <span class="ni">📋</span> Booking Form
        </a>
        <a class="cd-nav-item" id="navSubmitted" onclick="showTab('submitted');closeSidebar();">
          <span class="ni">📂</span> My Submissions
        </a>
        <a class="cd-nav-item" id="navRejected" onclick="showTab('rejected');closeSidebar();">
          <span class="ni">✖</span> Rejected
        </a>
      </nav>
      <div class="cd-sidebar-footer">
        <div class="cd-welcome" id="cdWelcome"><strong>Welcome!</strong></div>
        <button class="cd-signout" onclick="confirmLogout()">⇥ Sign Out</button>
      </div>
    </aside>

    <main class="cd-main">

      <!-- BOOKING FORM TAB -->
      <div id="tabBooking">
        <div class="hero">
          <div class="petals" id="petals"></div>
          <div class="hero-content">
            <span class="hero-bow">🎀</span>
            <div class="hero-name">Jeoan Gwyneth<br>Dajay Gran</div>
            <div class="hero-script">Singer for Hire</div>
            <div class="hero-tagline">Making your event unforgettable</div>
            <div class="loc-chip">📍 South Cotabato Based</div>
          </div>
        </div>
        <div class="form-bg">
          <div class="body">
            <div class="section-head">🎀 Booking Form</div>
            <div class="field"><label>Client Name *</label><input type="text" id="clientName" placeholder="Your full name"/></div>
            <div class="field"><label>Event Date *</label><input type="text" id="eventDate" placeholder="e.g. June 15, 2025"/></div>
            <div class="field"><label>Performance Time *</label><input type="text" id="perfTime" placeholder="e.g. 6:00 PM"/></div>
            <div class="field">
              <label>Event Occasion *</label>
              <p class="field-hint">What type of event is it?</p>
              <select id="occasion">
                <option value="" disabled selected>— Choose occasion —</option>
                <option>Birthday Party</option>
                <option>Session Vocalist / Band Sub</option>
                <option>Party</option>
                <option>Resto Bar</option>
                <option>Wedding</option>
                <option>Reception</option>
              </select>
            </div>
            <div class="field"><label>Venue Address *</label><textarea id="venue" rows="2" placeholder="Full venue address…"></textarea></div>
            <div class="field">
              <label>Rate Type *</label>
              <p class="field-hint">Choose how you'd like to book her</p>
              <div class="rate-toggle">
                <div class="rate-btn">
                  <input type="radio" name="rateType" id="rateSong" value="song" onchange="switchRate()"/>
                  <label class="rate-label" for="rateSong"><span class="rb"></span> 🎵 Per Song</label>
                </div>
                <div class="rate-btn">
                  <input type="radio" name="rateType" id="rateHour" value="hour" onchange="switchRate()"/>
                  <label class="rate-label" for="rateHour"><span class="rb"></span> ⏱️ Per Hour</label>
                </div>
              </div>
              <div class="pkg-box" id="songBox">
                <p class="field-hint">Pick the number of songs you need 🎵</p>
                <select id="songPkg" onchange="showPrice('song')">
                  <option value="" disabled selected>— Choose song package —</option>
                  <option value="1–6 Songs|₱400">1–6 Songs — ₱400</option>
                  <option value="1–10 Songs|₱450">1–10 Songs — ₱450</option>
                  <option value="1–15 Songs|₱500">1–15 Songs — ₱500</option>
                  <option value="Band Sub|Negotiable">Band Sub — Negotiable</option>
                </select>
                <div class="price-tag" id="songPrice"></div>
              </div>
              <div class="pkg-box" id="hourBox">
                <p class="field-hint">Pick how many hours you need her ⏱️</p>
                <select id="hourPkg" onchange="showPrice('hour')">
                  <option value="" disabled selected>— Choose hour package —</option>
                  <option value="1 Hour|₱500">1 Hour — ₱500</option>
                  <option value="1 Hr 30 Mins|₱600">1 Hour 30 Mins — ₱600</option>
                  <option value="2 Hours|₱650">2 Hours — ₱650</option>
                </select>
                <div class="price-tag" id="hourPrice"></div>
              </div>
            </div>
            <div class="field"><label>Song Requests / Notes</label><textarea id="notes" rows="2" placeholder="Special requests, attire preferences, etc."></textarea></div>
            <div class="section-head">📜 Terms &amp; Conditions</div>
            <div class="terms-card">
              <div class="terms-card-head"><span>🎀 Please read before booking</span></div>
              <div class="terms-list">
                <div class="term"><div class="term-dot">1</div><div><strong>Downpayment:</strong> ₱200 non-refundable to reserve your date. Deducted from total.</div></div>
                <div class="term"><div class="term-dot">2</div><div><strong>Payment:</strong> Balance paid (Cash / GCash) immediately after the performance.</div></div>
                <div class="term"><div class="term-dot">3</div><div><strong>Technical:</strong> Venue/Client must provide a functional sound system and microphone.</div></div>
                <div class="term"><div class="term-dot">4</div><div><strong>Setup:</strong> I will arrive 30 minutes early for soundcheck.</div></div>
                <div class="term"><div class="term-dot">5</div><div><strong>Cancellation:</strong> Downpayment is forfeited if the client cancels. If I cancel due to an emergency, 100% refund.</div></div>
                <div class="term"><div class="term-dot">6</div><div><strong>Safety:</strong> Outdoor venues must have a covered area for the performer.</div></div>
              </div>
            </div>
            <label class="agree-row" for="agreeCheck" onclick="toggleCB()">
              <input type="checkbox" id="agreeCheck"/>
              <div class="custom-cb" id="customCB">
                <svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 4L4 7L10 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <span class="agree-label">I have read and <strong>agree</strong> to all Terms &amp; Conditions above.</span>
            </label>
            <div class="section-head">💚 Downpayment via GCash</div>
            <div class="gcash-form-box">
              <div class="gcash-form-head"><span>📸</span><span>Pay ₱200 &amp; Upload Screenshot</span></div>
              <div class="gcash-form-body">
                <div class="gc-inline">
                  <div class="gc-inline-head">💚 GCash Number</div>
                  <div class="gc-inline-body">
                    <div><div class="gc-inline-name">JEOAN GWYNETH G.</div><div class="gc-inline-num">0912 797 7245</div></div>
                    <div class="gc-inline-badge">₱200 DP</div>
                  </div>
                </div>
                <p>Send <strong>₱200</strong> to the number above, then upload your GCash confirmation screenshot here. <strong>Screenshot is required</strong> before your booking can be submitted. 💕</p>
                <div class="upload-area" id="uploadArea">
                  <input type="file" id="gcashFile" accept="image/*" onchange="handleGcashUpload(this)"/>
                  <span class="upload-icon">📱</span>
                  <span class="upload-label">Tap to upload GCash screenshot</span>
                  <span class="upload-sublabel">JPG, PNG — your GCash confirmation receipt</span>
                </div>
                <div class="gcash-preview" id="gcashPreview">
                  <img id="gcashPreviewImg" src="" alt="GCash Screenshot Preview"/>
                  <div class="gcash-preview-actions">
                    <span class="gcash-preview-label">✅ Screenshot ready</span>
                    <button class="btn-reupload" onclick="reuploadScreenshot()">Change photo</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="section-head">✅ Confirm Booking</div>
            <div id="submitHintEl" class="submit-hint">Fill in all required fields and upload your GCash screenshot to proceed.</div>
            <div class="action-bar">
              <button class="btn-cancel" onclick="confirmCancel()">✕ Cancel</button>
              <button class="btn-submit" id="submitBtn" onclick="submitForm()" disabled>🎀 Submit Booking</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MY SUBMISSIONS TAB -->
      <div id="tabSubmitted" style="display:none;">
        <div class="cd-page-header">
          <div class="cd-page-title">My Submissions</div>
          <div class="cd-page-subtitle">Your submitted booking requests</div>
        </div>
        <div class="cd-scroll" id="submittedList">
          <div class="cd-spinner-wrap"><div class="cd-spinner"></div></div>
        </div>
      </div>

      <!-- REJECTED TAB -->
      <div id="tabRejected" style="display:none;">
        <div class="cd-page-header">
          <div class="cd-page-title">Rejected Bookings</div>
          <div class="cd-page-subtitle">Edit and resubmit your declined bookings</div>
        </div>
        <div class="cd-scroll" id="rejectedList">
          <div class="cd-spinner-wrap"><div class="cd-spinner"></div></div>
        </div>
      </div>

    </main>
  </div>
</div>

<!-- THANK YOU PAGE -->
<div id="thankYouPage">
  <div class="sparkles" id="sparkles"></div>
  <div class="ty-compact">
    <div class="ty-top">
      <span class="emoji">🌸</span>
      <h2>Booking submitted! 🎀</h2>
      <p>Jeoan will review your booking and reach out to you shortly. 💕</p>
    </div>
    <div class="cc">
      <div class="cc-head">🌸 Booking Summary</div>
      <div id="summaryRows"></div>
    </div>
    <div class="cc">
      <div class="cc-head light">📜 Terms &amp; Conditions</div>
      <div class="tc-row"><span class="tc-n">1.</span><span>₱200 non-refundable downpayment. Deducted from total.</span></div>
      <div class="tc-row"><span class="tc-n">2.</span><span>Balance paid (Cash/GCash) after performance.</span></div>
      <div class="tc-row"><span class="tc-n">3.</span><span>Client provides sound system &amp; microphone.</span></div>
      <div class="tc-row"><span class="tc-n">4.</span><span>Performer arrives 30 mins early for soundcheck.</span></div>
      <div class="tc-row"><span class="tc-n">5.</span><span>Client cancels = DP forfeited. Performer cancels = 100% refund.</span></div>
      <div class="tc-row"><span class="tc-n">6.</span><span>Outdoor venues must have covered area for performer.</span></div>
    </div>
    <div class="ty-ss-box">
      <div class="ty-ss-head">📱 GCash Screenshot Submitted</div>
      <div class="ty-ss-body"><img id="tyScreenshot" src="" alt="GCash Payment Screenshot"/></div>
    </div>
    <div class="ty-footer"><button class="btn-logout" onclick="confirmLogout()">Sign Out</button></div>
    <div class="ty-sig">Jeoan Gwyneth Dajay Gran ✦ Singer for Hire</div>
  </div>
</div>

<!-- IMAGE LIGHTBOX -->
<div class="cd-lightbox" id="cdLightbox" onclick="closeLightbox()">
  <button class="cd-lightbox-close" onclick="closeLightbox()">✕</button>
  <img id="cdLightboxImg" src="" alt="Screenshot"/>
</div>

<!-- EDIT / RESUBMIT MODAL -->
<div class="cd-edit-overlay" id="cdEditOverlay">
  <div class="cd-edit-box">
    <div class="cd-edit-title">✏️ Edit &amp; Resubmit Booking</div>
    <div class="cd-edit-sub">Update your details and resubmit for Jeoan's review 💕</div>
    <input type="hidden" id="editBookingId"/>
    <div class="cd-edit-field"><label>Client Name *</label><input type="text" id="editName" placeholder="Your full name"/></div>
    <div class="cd-edit-field"><label>Event Date *</label><input type="text" id="editDate" placeholder="e.g. June 15, 2025"/></div>
    <div class="cd-edit-field"><label>Performance Time *</label><input type="text" id="editPerfTime" placeholder="e.g. 6:00 PM"/></div>
    <div class="cd-edit-field">
      <label>Event Occasion *</label>
      <select id="editOccasion">
        <option value="" disabled>— Choose occasion —</option>
        <option>Birthday Party</option>
        <option>Session Vocalist / Band Sub</option>
        <option>Party</option>
        <option>Resto Bar</option>
        <option>Wedding</option>
        <option>Reception</option>
      </select>
    </div>
    <div class="cd-edit-field"><label>Venue Address *</label><textarea id="editVenue" rows="2" placeholder="Full venue address…"></textarea></div>
    <div class="cd-edit-field"><label>Package</label><input type="text" id="editPackage" placeholder="e.g. 1–10 Songs — ₱450"/></div>
    <div class="cd-edit-field"><label>Notes</label><textarea id="editNotes" rows="2" placeholder="Special requests, attire preferences, etc."></textarea></div>
    <div class="cd-edit-ss-box">
      <p>📱 Update your GCash screenshot if needed (optional — keeps existing if not changed)</p>
      <img id="editSsPreview" class="cd-edit-ss-preview" src="" alt="Screenshot preview"/>
      <div>
        <label class="cd-edit-upload-btn" style="display:inline-block;cursor:pointer;">
          📂 Choose Screenshot
          <input type="file" id="editSsFile" accept="image/*" style="display:none;" onchange="handleEditScreenshot(this)"/>
        </label>
      </div>
    </div>
    <div class="cd-edit-error" id="editError"></div>
    <div class="cd-edit-actions">
      <button class="cd-edit-btn-cancel" onclick="closeEditModal()">Cancel</button>
      <button class="cd-edit-btn-submit" id="editSubmitBtn" onclick="doResubmit()">🎀 Resubmit Booking</button>
    </div>
  </div>
</div>

<!-- MODALS -->
<div class="cd-modal-overlay" id="logoutModal">
  <div class="cd-modal-box">
    <span class="cd-modal-icon">🎀</span>
    <div class="cd-modal-title">Sign Out?</div>
    <div class="cd-modal-msg">Are you sure you want to sign out? You can always come back and book again! 💕</div>
    <div class="cd-modal-actions">
      <button class="cd-modal-btn-cancel" onclick="closeLogoutModal()">Stay</button>
      <button class="cd-modal-btn-confirm" onclick="doLogout()">Sign Out</button>
    </div>
  </div>
</div>
<div class="cd-modal-overlay" id="cancelModal">
  <div class="cd-modal-box">
    <span class="cd-modal-icon">🗑️</span>
    <div class="cd-modal-title">Cancel Booking?</div>
    <div class="cd-modal-msg">This will <strong>clear all the details</strong> you've entered. Are you sure?</div>
    <div class="cd-modal-actions">
      <button class="cd-modal-btn-cancel" onclick="closeCancelModal()">Go Back</button>
      <button class="cd-modal-btn-confirm" style="background:linear-gradient(135deg,#e05555,#c0392b);" onclick="doCancelForm()">Yes, Clear Form</button>
    </div>
  </div>
</div>

<div class="cd-toast" id="cdToast"></div>

<script src="client-scripts.js"></script>
<script>
// ════════════════════════════════════════════
// BOOKING MAP — stores full booking objects
// keyed by id. The edit button passes only
// the id — never JSON in HTML attributes.
// ════════════════════════════════════════════
var _bookingsMap = {};

// ── AUTH GUARD ───────────────────────────────────────────────────────────────
(async function guard() {
  var token = sessionStorage.getItem('client_token');
  if (!token) { window.location.replace('client.html'); return; }
  try {
    var res = await fetch(window.location.origin + '/client/bookings', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.status === 401 || res.status === 403) {
      sessionStorage.removeItem('client_token');
      sessionStorage.removeItem('client_display_name');
      sessionStorage.removeItem('client_username');
      window.location.replace('client.html');
      return;
    }
  } catch (e) {
    // Network error — still allow dashboard (offline graceful)
  }
  initDashboard();
})();

function initDashboard() {
  initFormPetals();
  var dn = sessionStorage.getItem('client_display_name') || '';
  var un = sessionStorage.getItem('client_username') || '';
  var el = document.getElementById('cdWelcome');
  if (el) el.innerHTML = '<strong>' + escHtml(dn || un) + '</strong>@' + escHtml(un);
}

// ── SIDEBAR ──────────────────────────────────────────────────────────────────
function toggleSidebar() {
  var s = document.getElementById('cdSidebar');
  var o = document.getElementById('cdSidebarOverlay');
  var b = document.getElementById('cdHamburger');
  var open = s.classList.toggle('open');
  o.classList.toggle('show', open);
  b.textContent = open ? '✕' : '☰';
}
function closeSidebar() {
  document.getElementById('cdSidebar').classList.remove('open');
  document.getElementById('cdSidebarOverlay').classList.remove('show');
  document.getElementById('cdHamburger').textContent = '☰';
}

// ── TABS ─────────────────────────────────────────────────────────────────────
function showTab(tab) {
  ['tabBooking','tabSubmitted','tabRejected'].forEach(function(id){
    document.getElementById(id).style.display='none';
  });
  ['navBooking','navSubmitted','navRejected'].forEach(function(id){
    document.getElementById(id).classList.remove('active');
  });
  if (tab === 'booking') {
    document.getElementById('tabBooking').style.display = '';
    document.getElementById('navBooking').classList.add('active');
  } else if (tab === 'submitted') {
    document.getElementById('tabSubmitted').style.display = '';
    document.getElementById('navSubmitted').classList.add('active');
    loadSubmissions();
  } else if (tab === 'rejected') {
    document.getElementById('tabRejected').style.display = '';
    document.getElementById('navRejected').classList.add('active');
    loadRejected();
  }
}

// ── STATUS BADGE ─────────────────────────────────────────────────────────────
function statusBadge(status) {
  var map = {
    'pending':  '<span class="status-badge status-pending">⏳ Pending</span>',
    'confirmed':'<span class="status-badge status-approved">✅ Confirmed</span>',
    'approved': '<span class="status-badge status-approved">✅ Approved</span>',
    'declined': '<span class="status-badge status-declined">✖ Declined</span>'
  };
  return map[status] || '<span class="status-badge status-pending">' + escHtml(status) + '</span>';
}

// ── BOOKING CARD ─────────────────────────────────────────────────────────────
// FIX: never put JSON in onclick — use only the booking id.
// The full booking object is stored in _bookingsMap[id].
function bookingCard(b, rejected) {
  var ssHtml = '';
  if (b.gcashScreenshot) {
    ssHtml = '<div class="bk-screenshot">'
      + '<div class="bk-ss-label">📱 GCash Screenshot — tap to view</div>'
      + '<img src="' + escHtml(b.gcashScreenshot) + '" alt="GCash screenshot" onclick="openLightbox(this.src);event.stopPropagation();" />'
      + '</div>';
  }
  var actionsHtml = '';
  if (rejected) {
    actionsHtml = '<div class="bk-card-actions">'
      + '<button class="bk-btn-edit" onclick="openEditModal(' + b.id + ')">✏️ Edit &amp; Resubmit</button>'
      + '</div>';
  }
  return '<div class="bk-card">'
    + '<div class="bk-card-head">'
    + '<div class="bk-card-name">' + escHtml(b.name || '—') + '</div>'
    + statusBadge(b.status || 'pending')
    + '</div>'
    + '<div class="bk-card-body">'
    + '<div>📅 ' + escHtml(b.date || '—') + ' · ⏰ ' + escHtml(b.perfTime || '—') + '</div>'
    + '<div>🎉 ' + escHtml(b.occasion || '—') + '</div>'
    + '<div>📍 ' + escHtml(b.venue || '—') + '</div>'
    + '<div>💳 ' + escHtml(b.package || '—') + '</div>'
    + (b.notes ? '<div>📝 ' + escHtml(b.notes) + '</div>' : '')
    + (rejected && b.adminNote
        ? '<div class="bk-card-reason">📋 Reason: ' + escHtml(b.adminNote) + '</div>'
        : '')
    + ssHtml
    + '</div>'
    + actionsHtml
    + '</div>';
}

// ── LOAD SUBMISSIONS ─────────────────────────────────────────────────────────
async function loadSubmissions() {
  var el = document.getElementById('submittedList');
  el.innerHTML = '<div class="cd-spinner-wrap"><div class="cd-spinner"></div></div>';
  try {
    var res = await fetch(window.location.origin + '/client/bookings', {
      headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('client_token') }
    });
    if (res.status === 401 || res.status === 403) { doLogout(); return; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    var list = (Array.isArray(data) ? data : (data.bookings || []))
      .filter(function(b){ return b.status !== 'declined'; });
    el.innerHTML = list.length
      ? list.map(function(b) { return bookingCard(b, false); }).join('')
      : '<div class="cd-empty"><span class="cd-ei">📂</span><p>No submissions yet.<br>Fill out the Booking Form to get started! 🌸</p></div>';
  } catch(e) {
    el.innerHTML = '<div class="cd-empty"><span class="cd-ei">⚠️</span><p>Could not load submissions.<br><small>' + escHtml(e.message) + '</small></p></div>';
  }
}

// ── LOAD REJECTED ────────────────────────────────────────────────────────────
async function loadRejected() {
  var el = document.getElementById('rejectedList');
  el.innerHTML = '<div class="cd-spinner-wrap"><div class="cd-spinner"></div></div>';
  try {
    var res = await fetch(window.location.origin + '/client/bookings/rejected', {
      headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('client_token') }
    });
    if (res.status === 401 || res.status === 403) { doLogout(); return; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    var list = Array.isArray(data) ? data : (data.bookings || []);

    // Store all rejected bookings in the map by id
    _bookingsMap = {};
    list.forEach(function(b){ _bookingsMap[b.id] = b; });

    el.innerHTML = list.length
      ? list.map(function(b) { return bookingCard(b, true); }).join('')
      : '<div class="cd-empty"><span class="cd-ei">🎉</span><p>No rejected bookings — you\'re all good! 🌸</p></div>';
  } catch(e) {
    el.innerHTML = '<div class="cd-empty"><span class="cd-ei">⚠️</span><p>Could not load rejections.<br><small>' + escHtml(e.message) + '</small></p></div>';
  }
}

// ── LIGHTBOX ─────────────────────────────────────────────────────────────────
function openLightbox(src) {
  document.getElementById('cdLightboxImg').src = src;
  document.getElementById('cdLightbox').classList.add('show');
}
function closeLightbox() {
  document.getElementById('cdLightbox').classList.remove('show');
  document.getElementById('cdLightboxImg').src = '';
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeLightbox();
});

// ── EDIT / RESUBMIT MODAL ────────────────────────────────────────────────────
var editNewScreenshot = null;

// FIX: accepts only the booking ID, looks up full data from _bookingsMap
function openEditModal(id) {
  var b = _bookingsMap[id];
  if (!b) return;
  editNewScreenshot = null;
  document.getElementById('editBookingId').value  = b.id;
  document.getElementById('editName').value        = b.name      || '';
  document.getElementById('editDate').value        = b.date      || '';
  document.getElementById('editPerfTime').value    = b.perfTime  || '';
  document.getElementById('editOccasion').value    = b.occasion  || '';
  document.getElementById('editVenue').value       = b.venue     || '';
  document.getElementById('editPackage').value     = b.package   || '';
  document.getElementById('editNotes').value       = b.notes     || '';
  var preview = document.getElementById('editSsPreview');
  if (b.gcashScreenshot) {
    preview.src = b.gcashScreenshot;
    preview.classList.add('show');
  } else {
    preview.src = '';
    preview.classList.remove('show');
  }
  document.getElementById('editSsFile').value = '';
  document.getElementById('editError').classList.remove('show');
  document.getElementById('editError').textContent = '';
  document.getElementById('editSubmitBtn').disabled = false;
  document.getElementById('editSubmitBtn').textContent = '🎀 Resubmit Booking';
  document.getElementById('cdEditOverlay').classList.add('show');
}

function closeEditModal() {
  document.getElementById('cdEditOverlay').classList.remove('show');
  editNewScreenshot = null;
}

function handleEditScreenshot(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var maxDim = 900, w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      editNewScreenshot = canvas.toDataURL('image/jpeg', 0.72);
      var preview = document.getElementById('editSsPreview');
      preview.src = editNewScreenshot;
      preview.classList.add('show');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
}

async function doResubmit() {
  var id       = document.getElementById('editBookingId').value;
  var name     = document.getElementById('editName').value.trim();
  var date     = document.getElementById('editDate').value.trim();
  var perfTime = document.getElementById('editPerfTime').value.trim();
  var occasion = document.getElementById('editOccasion').value;
  var venue    = document.getElementById('editVenue').value.trim();
  var pkg      = document.getElementById('editPackage').value.trim();
  var notes    = document.getElementById('editNotes').value.trim();
  var errEl    = document.getElementById('editError');
  errEl.classList.remove('show');
  if (!name || !date || !perfTime || !occasion || !venue) {
    errEl.textContent = 'Please fill in all required fields.';
    errEl.classList.add('show'); return;
  }
  var btn = document.getElementById('editSubmitBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Submitting…';
  try {
    var body = { name: name, date: date, perfTime: perfTime, occasion: occasion, venue: venue, package: pkg, notes: notes };
    if (editNewScreenshot) body.gcashScreenshot = editNewScreenshot;
    var res = await fetch(window.location.origin + '/client/bookings/' + id + '/resubmit', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + sessionStorage.getItem('client_token')
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      var err = await res.json().catch(function(){ return {}; });
      errEl.textContent = err.error || 'Could not resubmit. Please try again.';
      errEl.classList.add('show');
      btn.disabled = false; btn.textContent = '🎀 Resubmit Booking'; return;
    }
    closeEditModal();
    showToast('✅ Booking resubmitted! Jeoan will review it shortly 💕');
    loadRejected();
  } catch(e) {
    errEl.textContent = 'Cannot connect to server. Please try again.';
    errEl.classList.add('show');
    btn.disabled = false; btn.textContent = '🎀 Resubmit Booking';
  }
}

// ── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  var t = document.getElementById('cdToast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 3200);
}

// ── LOGOUT ───────────────────────────────────────────────────────────────────
function confirmLogout(){ document.getElementById('logoutModal').classList.add('show'); }
function closeLogoutModal(){ document.getElementById('logoutModal').classList.remove('show'); }
function closeCancelModal(){ document.getElementById('cancelModal').classList.remove('show'); }

function doLogout() {
  closeLogoutModal();
  sessionStorage.removeItem('client_token');
  sessionStorage.removeItem('client_display_name');
  sessionStorage.removeItem('client_username');
  window.location.replace('client.html');
}
</script>
</body>
</html>
