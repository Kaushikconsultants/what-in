# Meta App Use Cases & What-In Integration Master Guide

This document provides a comprehensive breakdown of all Meta App Use Cases available in the Meta Developer Portal (`what-in pixel` / Business ID: `1320250379153598`), explaining what each use case does, how it applies to What-In & Espon Clothing, what has already been built in our codebase, and exactly which permissions/use cases to enable.

---

## 1. Executive Summary & Quick Recommendation

In your Meta Developer App (**what-in pixel**), select the following use cases:

| Priority | Category | Use Case Name | Purpose for What-In |
| :--- | :--- | :--- | :--- |
| 🔴 **CRITICAL** | **Business Messaging** | **Connect with customers through WhatsApp** | Powers WhatsApp Cloud API (Inbox, Broadcasts, Chatbots, Templates). *(If on this app)* |
| 🔴 **MUST-HAVE** | **Ads & Monetization** | **Create & manage ads with Marketing API** | Powers Meta Conversions API (CAPI) & Custom Audience sync for 12,000+ contacts. |
| 🟡 **HIGH** | **Ads & Monetization** | **Manage products with Catalog API** | WhatsApp Single Product Messages (SPM) and Multi-Product Catalog (MPM) sync. |
| 🟡 **HIGH** | **Ads & Monetization** | **Capture & manage ad leads with Marketing API** | Real-time webhook for Facebook/Instagram Instant Lead Forms -> Instant WhatsApp trigger. |
| 🟢 **FUTURE** | **Business Messaging** | **Manage messaging & content on Instagram** | Unified Inbox expansion: receive and reply to Instagram DMs inside What-In. |

---

## 2. Detailed Breakdown of All Meta App Use Cases

### Category A: Ads and Monetization (6 Use Cases)

#### 1. Create & manage ads with Marketing API
- **What Meta Says**: *"Create, manage and optimize ad campaigns across Meta technologies. Programmatically extend, stop or update ad campaigns and more."*
- **What It Does**: Provides programmatic access to Meta Ads Manager, Ad Accounts, Pixel Datasets, and Custom Audiences.
- **Why It Matters for What-In**:
  1. **Meta Conversions API (CAPI)**: When a WhatsApp chatbot or salesperson closes a lead or an order is confirmed, What-In sends a server-side event (`Purchase`, `Lead`, `AddToCart`) directly to your Meta Pixel.
  2. **Custom Audience Sync**: What-In can push segmented contacts (e.g. VIP customers, high-value buyers from your 12,000+ contacts) into Meta Ad Audiences for retargeting and lookalike ad campaigns.
- **Priority**: 🔴 **MUST-HAVE**

#### 2. Capture & manage ad leads with Marketing API
- **What Meta Says**: *"Give potential customers a quick and safe way to sign up to get info about your business or products."*
- **What It Does**: Provides access to Meta Lead Gen forms and real-time webhooks whenever a prospect submits their details on Facebook/Instagram Lead Ads.
- **Why It Matters for What-In**:
  - Automatically captures the lead name, phone number, and answers into What-In Contacts Directory.
  - Instantly triggers an automated WhatsApp greeting template or chatbot menu (e.g. *"Hi Amit, thank you for showing interest in Espon Clothing! Here is our catalog..."*).
- **Priority**: 🟡 **HIGH** (If running Meta Lead Ads)

#### 3. Manage products with Catalog API
- **What Meta Says**: *"Manage catalogs and the products you want to promote across Meta technologies."*
- **What It Does**: Direct API access to Meta Commerce Manager Product Catalogs.
- **Why It Matters for What-In**:
  - What-In has Shopify product & combo sync.
  - To send WhatsApp **Single Product Messages (SPM)** or **Multi-Product Messages (MPM)** with interactive "View on WhatsApp" shopping carts, the Meta Catalog must be linked to your WhatsApp Business Account.
- **Priority**: 🟡 **HIGH** (For WhatsApp E-Commerce Catalog)

#### 4. Create & manage ads with ads MCP server
- **What Meta Says**: *"Build AI agents that manage ads on behalf of advertisers using the ads MCP server."*
- **What It Does**: Meta's new Model Context Protocol (MCP) server for external AI tools to view/adjust ad campaigns.
- **Why It Matters for What-In**: An emerging standard. Not needed for our current WhatsApp CRM operations.
- **Priority**: ⚪ **LOW / NOT NEEDED**

#### 5. Create & manage app ads with Meta Ads Manager
- **What Meta Says**: *"Promote your mobile app and drive installs. Create and manage campaigns that encourage users to download and install your app."*
- **What It Does**: Tailored for native iOS and Android mobile apps listed on Apple App Store or Google Play Store.
- **Why It Matters for What-In**: What-In is a responsive web application and e-commerce platform, not a native app store download.
- **Priority**: ❌ **NOT NEEDED**

#### 6. Advertise on your app with Meta Audience Network
- **What Meta Says**: *"Join Meta Audience Network to monetize your app and grow revenue with ads from Meta advertisers."*
- **What It Does**: Displays third-party banner and video ads inside your app to earn ad revenue (similar to Google AdSense / AdMob).
- **Why It Matters for What-In**: What-In is your internal business CRM and commerce hub; you do not want third-party banner ads showing to your team or customers.
- **Priority**: ❌ **NOT NEEDED**

---

### Category B: Business Messaging (3 Use Cases)

#### 1. Connect with customers through WhatsApp
- **What Meta Says**: *"Start a WhatsApp conversation, send notifications, create ads that click-to-WhatsApp and provide support. Business portfolio required."*
- **What It Does**: Unlocks the WhatsApp Business Cloud API.
- **Why It Matters for What-In**:
  - **The core engine of What-In.**
  - Handles message sending, webhook ingestion, template approval sync, media messaging, interactive lists/buttons, and live chat.
- **Priority**: 🔴 **CRITICAL (Must-Have)**
  > *Note*: If your WhatsApp Cloud API was already configured under another Meta App, keep that active. If this app (`what-in pixel`) is your primary app, this must be selected.

#### 2. Manage messaging & content on Instagram
- **What Meta Says**: *"Publish posts, share stories, respond to comments, answer direct messages and more with the Instagram API."*
- **What It Does**: API access to Instagram Business accounts for Direct Messages (DMs) and Story Mentions.
- **Why It Matters for What-In**:
  - Provides the path to a **Unified Inbox** inside What-In: agents can answer WhatsApp messages and Instagram DMs from the same screen.
- **Priority**: 🟡 **HIGH (Future Expansion)**

#### 3. Engage with customers on Messenger from Meta
- **What Meta Says**: *"Respond to messages sent to your business' Facebook Page. You can set up automatic replies or use a human agent to respond."*
- **What It Does**: Read and reply to Facebook Page Messenger chats.
- **Why It Matters for What-In**: Useful if customers message your Facebook Page directly.
- **Priority**: ⚪ **MEDIUM (Optional)**

---

### Category C: Content Management & Others (7 Use Cases)

| Use Case Name | Description | What-In Relevance | Priority |
| :--- | :--- | :--- | :--- |
| **Track engagement with Meta App Events** | SDK event tracking for mobile apps. | We use Meta Conversions API (CAPI) on the server side instead. | ⚪ **LOW** |
| **Manage everything on your Page** | Post to Facebook Page and moderate follower comments. | Only needed if building Facebook Page auto-comment moderation. | ⚪ **OPTIONAL** |
| **Access the Threads API** | Read and publish Threads posts. | Not relevant for WhatsApp CRM & sales. | ❌ **NOT NEEDED** |
| **Access the Live Video API** | Stream live video to Facebook. | Not relevant for WhatsApp CRM & sales. | ❌ **NOT NEEDED** |
| **Embed Facebook, Instagram content** | oEmbed API for embedding posts on websites. | Not relevant for WhatsApp CRM & sales. | ❌ **NOT NEEDED** |
| **Share or create fundraisers** | Charity and donation API. | Not applicable to commercial sales. | ❌ **NOT NEEDED** |

---

## 3. What Has Already Been Built in What-In (Inventory)

The following capabilities are already implemented and active in the What-In codebase:

### 1. WhatsApp Cloud API Infrastructure
- **Connected Account**: Live number `+91 74043 88242` with High Quality rating and 10,000 msgs/24h limit.
- **Meta Templates Hub**:
  - Fetches approved Meta templates in real-time.
  - Supports template creation with header media, dynamic variables `{{1}}`, quick reply buttons, and call-to-action buttons.
- **Unified WhatsApp Inbox**:
  - Two-way real-time messaging.
  - Multi-agent chat assignment (direct agent, team assignment, round-robin).
  - Internal customer notes, quick tags, quotations, and order attachments.
- **Visual Chatbot & Flow Builder**:
  - Drag-and-drop conversational nodes.
  - Interactive menus, buttons, dynamic product catalogs, and conditional branching.
  - Direct integration nodes for CRM leads, ERP, and Meta CAPI.
- **Broadcast Campaigns**:
  - Bulk audience messaging with scheduled delivery.
  - Delivery analytics: Sent, Delivered, Read, and Failed message counts.
- **WhatsApp Contacts Directory**:
  - Database stores 12,000+ customer records.
  - Server-side pagination (50 contacts per page) with quick page navigation.
  - Duplicate detection and smart merging based on clean phone keys.
  - Full-directory Excel export (up to 100,000 contacts).
  - Chunked Excel import with client-side progress bar and post-import team assignment.

### 2. Meta Conversions API (CAPI)
- **Active Node in Flow Engine** (`src/lib/whatsappFlowEngine.ts`):
  - When a user reaches a designated stage in a chatbot flow or an order is created, What-In sends a server-side event to your Meta Pixel (`1386264563245511`).
  - Automatically hashes customer phone and email with SHA-256 for Meta privacy compliance.
  - Endpoint `test-meta-capi` is available to verify event delivery directly into Meta Events Manager.

### 3. Meta Custom Audience Sync
- **Dedicated Endpoint** (`src/app/api/whatsapp/meta-custom-audience/route.ts`):
  - Allows exporting segmented contacts by tags or purchase history directly into a Meta Ad Account Custom Audience for retargeting campaigns.

### 4. Commerce & Shopify Catalog
- Products and Shopify combos synced in the PostgreSQL database.
- Ready for WhatsApp Single Product Messages (SPM) and Multi-Product Messages (MPM).

---

## 4. Step-by-Step Action Plan in Meta Developer Portal

To obtain a permanent, secure Access Token for your What-In features:

```mermaid
graph LR
    A["Meta Developer Portal"] --> B["Add Use Cases"]
    B --> C["Marketing API & Catalog API"]
    C --> D["Meta Business Settings"]
    D --> E["System Users"]
    E --> F["Generate Permanent Token"]
    F --> G["Paste Token into What-In"]
```

### Step 1: Add Selected Use Cases in the Modal
1. Under **Ads and monetization**, check:
   - `[x]` **Create & manage ads with Marketing API**
   - `[x]` **Manage products with Catalog API**
   - `[x]` **Capture & manage ad leads with Marketing API** *(if running lead forms)*
2. Under **Business messaging**, check:
   - `[x]` **Connect with customers through WhatsApp** *(if this app manages your WhatsApp number)*
   - `[x]` **Manage messaging & content on Instagram** *(optional, for future IG Inbox)*
3. Click the blue **Save** button in the bottom-right corner.

### Step 2: Generate a Permanent System User Token (Never Expires)
> [!IMPORTANT]
> Do NOT use temporary tokens from the Graph API Explorer (they expire in 1–24 hours). Always create a **System User Token** in Meta Business Manager.

1. Open **Meta Business Suite / Business Settings** (`business.facebook.com/settings`).
2. Go to **Users** -> **System Users**.
3. If not already created, click **Add** to create an Admin System User (e.g. `What-In System Admin`).
4. Click **Add Assets**:
   - Assign your **WhatsApp Business Account** with full control.
   - Assign your **Pixel / Dataset** with full control.
   - Assign your **Catalog** with full control.
   - Assign your **Ad Account** with manage campaigns permission.
5. Click **Generate New Token**:
   - Select your App: **what-in pixel**.
   - Set Token Expiration: **Never**.
   - Select the required permissions:
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`
     - `ads_management`
     - `ads_read`
     - `catalog_management`
     - `leads_retrieval`
6. Click **Generate Token** and copy the generated `EAA...` string.

### Step 3: Configure Token in What-In Platform
1. Log in to your What-In Dashboard (`what-in.tinkal.in`).
2. Navigate to **WhatsApp Hub** -> **Integrations** (or **Settings**).
3. Under **Meta Conversions API (CAPI)**:
   - Ensure the Pixel ID is set to `1386264563245511`.
   - Paste the System User Token into the **Access Token** field.
4. Click **Save & Test Connection**.

---

## 5. WhatsApp Webhook Fields Configuration (31 Subscribed, calls & message_echoes OFF)

In the Meta App (`what-in pixel`), under **Connect on WhatsApp** -> **Configuration**, 31 WhatsApp webhook fields are Subscribed. Both `calls` and `message_echoes` are kept **Unsubscribed / OFF** (cleaner setup; calls logic removed from codebase, and message_echoes is restricted/unneeded).

A dedicated field-by-field guide has been compiled in:
👉 **[WHATSAPP_WEBHOOK_FIELDS_GUIDE.md](file:///c:/Users/HP/Desktop/whatsapp-app/WHATSAPP_WEBHOOK_FIELDS_GUIDE.md)**

### Quick Summary of Webhook Processing:
1. **Already Active in Production (`src/app/api/whatsapp/webhook/route.ts`)**:
   - `messages`: Complete 2-way chat routing, media, button/list selections, delivery receipts (`sent`, `delivered`, `read`, `failed`).
   - `message_template_status_update`: Real-time template approval/rejection alerts + admin push notifications.
   - `flows`: Interactive Meta Flows decryption and payload handling.
   - Raw logs: 100% of all other events saved in `whatsAppWebhookLog`.

2. **Key Monitoring Events**:
   - `phone_number_quality_update`: Alerts if number health drops from Green to Yellow/Red.
   - `account_alerts`: Meta policy warnings and tier notices.
   - `template_category_update`: Alerts if Meta re-categorizes a template (e.g. Utility -> Marketing).

---

## 6. Social Channels Status (Instagram & Facebook Messenger)

> [!NOTE]
> **Status**: Shelved / On Hold.
> Meta App Review for Instagram Direct Messaging and Facebook Messenger requires extensive external reviewer verification, video screencasts, and business verification steps.
> To keep the platform fast, robust, and 100% focused on customer operations, Instagram and Facebook Messenger modules have been removed from the platform UI and endpoints.
>
> **Active Production Channel**: **WhatsApp Business Cloud API** (`/whatsapp/...`) with full catalog, orders, AI automation, and multi-agent customer messaging.

---

## 7. Multi-Client WhatsApp Differentiation Architecture

To ensure that multiple organizations, clients, or branches can operate simultaneously without messages ever mixing between tenants:

1. **Client-Dedicated Webhook URLs**:
   - WhatsApp: `https://what-in.tinkal.in/api/whatsapp/webhook/[clientId]`
2. **Client-Unique Verification Secrets**:
   - Each client generates a distinct verify secret automatically based on their unique `webhookClientId`:
     - Verification Secret: `wm_<first_8_chars_of_webhookClientId>`
3. **Payload-Level Account Isolation**:
   - Every incoming WhatsApp event contains the `phone_number_id` and `waba_id`.
   - The webhook processor maps this directly to the tenant's account in PostgreSQL, completely isolating conversations, contacts, templates, and analytics.
