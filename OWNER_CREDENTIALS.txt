# WHAT-IN Platform - Login Credentials & Deployment Details

**Domain**: https://what-in.tinkal.in
**GitHub Repository**: https://github.com/Kaushikconsultants/what-in.git

---

## 1. Owner / Super Admin Portal
The Owner Console allows you to manage all tenant clients, organizations, subscription plans, WABA credentials, and system settings.

- **Login URL**: https://what-in.tinkal.in/owner/login
- **Local URL**: http://localhost:3000/owner/login
- **Owner Password**: whatin-owner-2026

---

## 2. Client / Dashboard Portal (WhatsApp SaaS)
The main app interface for managing WhatsApp chats, AI agents, catalogs, broadcast campaigns, contacts, and automated workflows.

- **Login URL**: https://what-in.tinkal.in/login
- **Local URL**: http://localhost:3000/login
- **Admin Email**: admin@what-in.tinkal.in
- **Admin Password**: Admin@whatin2026
- **Role**: ADMIN (Full administrative privileges)

---

## 3. Meta Developer WhatsApp Webhook Setup
When configuring the WhatsApp Webhook in the Meta Developer App Dashboard:

- **Callback URL**: https://what-in.tinkal.in/api/whatsapp/webhook
- **Verify Token**: whatin_whatsapp_secure_webhook_token_2026
- **Subscribed Fields**: messages, messaging_postbacks, message_deliveries, message_reads

*(For dedicated client webhooks, use: https://what-in.tinkal.in/api/whatsapp/webhook/<clientId>)*

---

## 4. PostgreSQL Database Configuration (Railway)
The database has been initialized, schema pushed, and seeded with the initial admin account.

- **Connection URL**: postgresql://postgres:YstjLRGrOdqmzaxOUurUzIWRVAMLqZVX@metro.proxy.rlwy.net:15364/railway
- **Direct URL**: postgresql://postgres:YstjLRGrOdqmzaxOUurUzIWRVAMLqZVX@metro.proxy.rlwy.net:15364/railway

---

## 5. Railway Environment Variables
Ensure these environment variables are set in your Railway project service settings:

DATABASE_URL=postgresql://postgres:YstjLRGrOdqmzaxOUurUzIWRVAMLqZVX@metro.proxy.rlwy.net:15364/railway
DIRECT_URL=postgresql://postgres:YstjLRGrOdqmzaxOUurUzIWRVAMLqZVX@metro.proxy.rlwy.net:15364/railway
NEXTAUTH_URL=https://what-in.tinkal.in
NEXTAUTH_SECRET=whatin-nextauth-secret-2026-secure
SESSION_SECRET=whatin-session-2026
OWNER_PORTAL_SECRET=whatin-owner-2026
WHATSAPP_WEBHOOK_VERIFY_TOKEN=whatin_whatsapp_secure_webhook_token_2026
NODE_ENV=production

---

## 6. Custom Domain Setup on Railway
1. Open your project on Railway (https://railway.app).
2. Click your web service -> Settings -> Networking -> Custom Domain.
3. Add what-in.tinkal.in.
4. Add the CNAME record in your DNS provider (Cloudflare, GoDaddy, etc.) pointing what-in.tinkal.in to Railway's CNAME target.
