# Vuka Sacco → Moline Matatu Sacco Management System - Refactoring Guide

This document lists all changes needed to rename the project from "Vuka Sacco" to "Moline Matatu Sacco Management System".

## 1. DATABASE CHANGES

### File: `client/matis.sql`

```sql
-- OLD:
create database vuka;
use vuka;
-- Database: `vuka`

-- NEW:
create database moline_matatu;
use moline_matatu;
-- Database: `moline_matatu`
```

### File: `server/config/database.js` (Line 10)

```javascript
// OLD:
database: 'vuka',

// NEW:
database: 'moline_matatu',
```

---

## 2. PACKAGE.json FILES

### File: `server/package.json` (Line 13)

```json
// OLD:
"url": "git+https://github.com/Alloysj/Vuka.git"

// NEW:
"url": "git+https://github.com/Alloysj/Moline-Matatu.git"
```

### File: `client/package.json` (Lines 2, 93)

```json
// OLD:
"name": "vuka-sacco",
"repository": "https://github.com/Alloysj/Vuka.git"

// NEW:
"name": "moline-matatu-sacco",
"repository": "https://github.com/Alloysj/Moline-Matatu.git"
```

---

## 3. HTML & PUBLIC FILES

### File: `client/public/index.html` (Line 39)

```html
<!-- OLD: -->
<title>Vuka SACCO</title>

<!-- NEW: -->
<title>Moline Matatu SACCO</title>
```

---

## 4. EMAIL TEMPLATES

### File: `server/utils/mailer.js` (Lines 51, 55, 62, 64, 82, 87, 96, 98)

**Function: sendWelcomeEmail()**

```javascript
// OLD:
subject: 'Welcome to Vuka SACCO - Next Steps',
<strong>Vuka Matatu SACCO</strong>
Welcome aboard and thank you for choosing Vuka SACCO. Together, we drive success!
The Vuka SACCO Team

// NEW:
subject: 'Welcome to Moline Matatu SACCO - Next Steps',
<strong>Moline Matatu SACCO</strong>
Welcome aboard and thank you for choosing Moline Matatu SACCO. Together, we drive success!
The Moline Matatu SACCO Team
```

**Function: sendApprovalEmail()**

```javascript
// OLD:
subject: 'Shareholder Capital Payment Successful - Vuka SACCO',
You now have full access to Vuka SACCO's system features including:
Welcome again to the Vuka SACCO family!
The Vuka SACCO Team

// NEW:
subject: 'Shareholder Capital Payment Successful - Moline Matatu SACCO',
You now have full access to Moline Matatu SACCO's system features including:
Welcome again to the Moline Matatu SACCO family!
The Moline Matatu SACCO Team
```

---

## 5. REACT COMPONENT FILES

### File: `client/src/pages/contactUs.js` (Lines 61, 73, 161)

```javascript
// OLD:
Get in Touch with <span className="text-warning">Vuka SACCO</span>
{ text: "info@vukasacco.com", icon: faEnvelope },
title="Vuka SACCO Location"

// NEW:
Get in Touch with <span className="text-warning">Moline Matatu SACCO</span>
{ text: "info@molinematatu.com", icon: faEnvelope },
title="Moline Matatu SACCO Location"
```

### File: `client/src/pages/exitSacco.js` (Line 2)

```javascript
// OLD:
import withdrawalRequestPDF from "../assets/VUKA_withdrawal_request.pdf";

// NEW:
import withdrawalRequestPDF from "../assets/MOLINE_withdrawal_request.pdf";
```

### File: `client/src/pages/aboutUs.js` (Lines 20, 30, 43, 45, 96)

```javascript
// OLD:
About <span className="text-success">Vuka SACCO</span>
<h3><FontAwesomeIcon icon={faHandshake} className="text-success" /> About Vuka SACCO</h3>
Vuka SACCO is a cooperative dedicated to empowering its members through financial growth.
Since our inception, Vuka SACCO has achieved remarkable progress:

// NEW:
About <span className="text-success">Moline Matatu SACCO</span>
<h3><FontAwesomeIcon icon={faHandshake} className="text-success" /> About Moline Matatu SACCO</h3>
Moline Matatu SACCO is a cooperative dedicated to empowering its members through financial growth.
Since our inception, Moline Matatu SACCO has achieved remarkable progress:
```

### File: `client/src/pages/FAQ.js` (Lines 19, 21, 39, 56, 70)

```javascript
// OLD:
question: "What is the Vuka Matatu SACCO System?",
  "The Vuka Matatu SACCO System is a centralized platform designed to automate financial and administrative operations for Matatu SACCOs in Kenya.";
question: "Is my data secure in the Vuka SACCO System?",
  (<span className="text-warning">Vuka SACCO</span>);

// NEW:
question: "What is the Moline Matatu SACCO System?",
  "The Moline Matatu SACCO System is a centralized platform designed to automate financial and administrative operations for Matatu SACCOs in Kenya.";
question: "Is my data secure in the Moline Matatu SACCO System?",
  (<span className="text-warning">Moline Matatu SACCO</span>);
```

### File: `client/src/pages/HowToJoin.js` (Line 40)

```javascript
// OLD:
Join <span className="text-warning">Vuka SACCO</span>

// NEW:
Join <span className="text-warning">Moline Matatu SACCO</span>
```

### File: `client/src/pages/LandingPage.js` (Lines 16, 26, 28, 75, 92, 93)

```javascript
// OLD:
Join Vuka SACCO for secure savings and flexible loans.
<h2 className="mb-3">Vuka SACCO: Where Growth Meets Opportunity</h2>
At Vuka SACCO, we empower matatu owners with financial stability...
"Vuka SACCO helped me start my business. The support was amazing!"
&copy; {new Date().getFullYear()} Vuka SACCO. All rights reserved.
Email: info@vukasacco.com | Phone: +254 700 000 000

// NEW:
Join Moline Matatu SACCO for secure savings and flexible loans.
<h2 className="mb-3">Moline Matatu SACCO: Where Growth Meets Opportunity</h2>
At Moline Matatu SACCO, we empower matatu owners with financial stability...
"Moline Matatu SACCO helped me start my business. The support was amazing!"
&copy; {new Date().getFullYear()} Moline Matatu SACCO. All rights reserved.
Email: info@molinematatu.com | Phone: +254 700 000 000
```

### File: `client/src/pages/navBar.js` (Lines 3, 11)

```javascript
// OLD:
import saccoLogo from "../assets/vuka-logo-removebg.png";
<img src={saccoLogo} alt="Vuka SACCO Logo" style={{ width: "120px" }} />;

// NEW:
import saccoLogo from "../assets/moline-logo-removebg.png";
<img
  src={saccoLogo}
  alt="Moline Matatu SACCO Logo"
  style={{ width: "120px" }}
/>;
```

### File: `client/src/components/Sidebar.js` (Line 18)

```javascript
// OLD:
<span className="brand-text font-weight-light">Vuka SACCO</span>

// NEW:
<span className="brand-text font-weight-light">Moline Matatu SACCO</span>
```

### File: `client/src/staff/Side_nav.js` (Line 30)

```javascript
// OLD:
<span className="brand-text font-weight-light">Vuka SACCO system</span>

// NEW:
<span className="brand-text font-weight-light">Moline Matatu SACCO system</span>
```

### File: `client/src/admin/components/admin.js` (Line 130)

```javascript
// OLD:
<li className="breadcrumb-item active">Vuka SACCO management System</li>

// NEW:
<li className="breadcrumb-item active">Moline Matatu SACCO management System</li>
```

### File: `client/src/admin/components/Sidenav.js` (Line 26)

```javascript
// OLD:
<span className="brand-text font-weight-light">Vuka system</span>

// NEW:
<span className="brand-text font-weight-light">Moline Matatu system</span>
```

---

## 6. README.md (Lines 3, 5)

```markdown
// OLD:

# Vuka Sacco System

// NEW:

# Moline Matatu Sacco Management System
```

---

## 7. ASSET FILES TO RENAME

- `client/src/assets/vuka-logo-removebg.png` → `client/src/assets/moline-logo-removebg.png`
- `client/src/assets/VUKA_withdrawal_request.pdf` → `client/src/assets/MOLINE_withdrawal_request.pdf`

---

## 8. OPTIONAL: FOLDER RENAMING

The workspace folder structure can optionally be renamed:

- `vuka-zip/` → `moline-matatu-sacco/` (optional - current folder structure will still work)

---

## EXECUTION STEPS

1. **Database**: Update `matis.sql` and create new database `moline_matatu` instead of `vuka`
2. **Config**: Update `server/config/database.js` to point to `moline_matatu`
3. **Package files**: Update `server/package.json` and `client/package.json`
4. **HTML/Public**: Update `client/public/index.html`
5. **Email templates**: Update `server/utils/mailer.js` with new company name
6. **React components**: Update all page files with new company name
7. **Assets**: Rename/update logo and PDF files
8. **README**: Update main README with new project name

---

## VERIFICATION

After applying these changes:

1. Run database migrations with updated `matis.sql`
2. Test email sending to verify new company names appear
3. Check all UI components display new branding
4. Verify assets load correctly
5. Test frontend build: `npm run build` in client folder
6. Test backend: `npm start` in server folder
