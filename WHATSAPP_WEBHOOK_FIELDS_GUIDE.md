# Complete WhatsApp Webhook Fields Master Guide

This guide details all **33 WhatsApp Webhook Fields** available in the Meta Developer Portal (`what-in pixel` / WhatsApp Cloud API v26.0), what each event does, what is **already implemented in What-In**, and what is **recommended/important to handle**.

---

## 1. Quick Status Overview

| Webhook Field | Category | Status in What-In | Priority |
| :--- | :--- | :--- | :--- |
| `messages` | Messaging | ✅ **ALREADY DONE** (Live Chat, Bot, Media, Delivery Receipts) | 🔴 **CRITICAL (Must-Have)** |
| `message_template_status_update` | Templates | ✅ **ALREADY DONE** (Approval/Rejection Sync & Push Alert) | 🔴 **CRITICAL (Must-Have)** |
| `flows` | Interactive | ✅ **ALREADY DONE** (WhatsApp Interactive Flows & Form Builder) | 🟡 **HIGH** |
| `phone_number_quality_update` | Quality & Health | 🟡 **IMPORTANT TO LOG** (Green/Yellow/Red Quality Health) | 🟡 **HIGH** |
| `account_alerts` | Security & Health | 🟡 **IMPORTANT TO LOG** (Policy Violations, Ban Alerts) | 🟡 **HIGH** |
| `message_template_quality_update`| Templates | 🟡 **IMPORTANT TO LOG** (Template Quality Green/Yellow/Red) | 🟡 **HIGH** |
| `template_category_update` | Templates | 🟡 **IMPORTANT TO LOG** (Marketing vs Utility Re-categorization) | 🟡 **HIGH** |
| `calls` | Voice/Calling | ⚪ **OFF / UNSUBSCRIBED (Removed from Codebase)** | ⚪ **NOT NEEDED** |
| `message_echoes` | Messaging | ⚪ **OFF / UNSUBSCRIBED (Normal & Not Needed)** | ⚪ **NOT NEEDED** |
| `phone_number_name_update` | Account | ⚪ Optional (Display Name Approved/Rejected) | ⚪ **MEDIUM** |
| `messaging_handovers` | Inbox / Bot | ⚪ Optional (Bot to Human Agent Handover) | ⚪ **MEDIUM** |
| `payment_configuration_update` | Payments | ⚪ Optional (WhatsApp Pay / In-chat UPI status) | ⚪ **MEDIUM** |
| `group_*` (4 fields) | Groups | ⚪ Not used (What-In is 1-to-1 customer CRM) | ⚪ **LOW** |
| `smb_*` (2 fields) | SMB App | ⚪ Not applicable (For WhatsApp Business mobile app sync) | ⚪ **LOW** |
| Others (14 fields) | Internal/Advanced | ⚪ Meta internal / partner sync | ⚪ **LOW / BACKGROUND** |

---

## 2. Detailed Field-by-Field Breakdown (All 33 Fields)

---

### Group 1: Core Messaging, Delivery & Chats (The Heart of CRM)

#### 1. `messages`
* **What Meta Sends**: Real-time incoming text messages, images, documents, audio, videos, location, contact cards, interactive button clicks, list selections, and delivery status receipts (`sent`, `delivered`, `read`, `failed`).
* **Current Status in What-In**: ✅ **ALREADY FULLY IMPLEMENTED**
  * Handled in `src/app/api/whatsapp/webhook/route.ts`.
  * Deduplicates messages via `PROCESSED_WEBHOOK_IDS`.
  * Routes to active Visual Chatbot Flow (`executeFlowEngine`).
  * If AI mode enabled, passes to Gemini AI Engine (`handleIncomingAILogic`).
  * Saves to PostgreSQL database (`whatsAppMessage`, `whatsAppConversation`, `customer`).
  * Updates live Campaign Queue metrics (Delivered, Read, Failed).
* **Priority**: 🔴 **CRITICAL (Must-Have)**

#### 2. `message_echoes` (Currently OFF / Unsubscribed)
* **What Meta Sends**: Sends an "echo" (duplicate copy) back to the webhook whenever an *outbound* message is sent from the WhatsApp number by another system.
* **Why Meta Does Not Allow Turning It On**:
  - Meta restricts `message_echoes` to approved **Business Solution Providers (BSPs)** or apps with specialized Cloud API Multi-Device/Co-existence features enabled. For standard developer apps, Meta locks this toggle to `Unsubscribed`.
* **Is It Needed for What-In?**: **NO, ABSOLUTELY NOT.**
  - When an agent sends a message from What-In Inbox, What-In **already writes the message directly into the PostgreSQL database** with status `SENT`.
  - When a Broadcast is launched, What-In already tracks each message in `whatsAppCampaignQueue`.
  - When a Chatbot responds, What-In already logs the bot message.
  - In fact, turning `message_echoes` ON is often avoided because without complex filtering, it sends an echo of every message What-In sends, which can cause **duplicate message bubbles** in the chat screen!
* **Conclusion**: **Leave it OFF / Unsubscribed.** It has zero impact on What-In's messaging functionality.
* **Priority**: ⚪ **NOT NEEDED (Normal to be OFF)**

#### 3. `smb_message_echoes`
* **What Meta Sends**: Similar to `message_echoes`, but specifically when an agent replies from the WhatsApp Business Mobile App (Co-existence mode).
* **Current Status in What-In**: ⚪ Subscribed / Logged.
* **Priority**: ⚪ **LOW**

#### 4. `messaging_handovers`
* **What Meta Sends**: Notifies when control of a conversation is passed between different systems (e.g. from an automated chatbot to a live human agent system).
* **Current Status in What-In**: What-In manages bot-to-agent assignment internally in its PostgreSQL database (`whatsAppConversation.assignedEmployeeId`).
* **Priority**: ⚪ **MEDIUM**

#### 5. `standby`
* **What Meta Sends**: Messages received while the app is in the "standby" role in Meta's handover protocol.
* **Current Status in What-In**: Logged in `whatsAppWebhookLog`.
* **Priority**: ⚪ **LOW**

#### 6. `history`
* **What Meta Sends**: Syncs historical conversation context when migrating or reconnecting accounts.
* **Current Status in What-In**: Logged in `whatsAppWebhookLog`.
* **Priority**: ⚪ **LOW**

---

### Group 2: Template Lifecycle, Approvals & Quality

#### 7. `message_template_status_update`
* **What Meta Sends**: Fired immediately whenever a template changes status: `APPROVED`, `REJECTED`, `PAUSED`, `DISABLED`, or `PENDING_DELETION`.
* **Current Status in What-In**: ✅ **ALREADY FULLY IMPLEMENTED**
  * Automatically updates template status and stores `rejectionReason` in `whatsAppTemplate` table.
  * Dispatches instant Push Notification to What-In Admins (`notifyAdminsOfTemplateStatusChange`).
* **Priority**: 🔴 **CRITICAL (Must-Have)**

#### 8. `message_template_quality_update`
* **What Meta Sends**: Alerts when an approved template's quality score changes (`GREEN`, `YELLOW`, `RED`). A red template risks being paused by Meta.
* **Current Status in What-In**: Received in webhook payload logs.
* **Recommendation**: Can update `whatsAppTemplate.qualityRating` so admins see warning badges on templates with declining quality.
* **Priority**: 🟡 **HIGH**

#### 9. `message_template_components_update`
* **What Meta Sends**: Alerts when Meta makes minor formatting adjustments to template headers, footers, or button layouts.
* **Current Status in What-In**: Logged in `whatsAppWebhookLog`.
* **Priority**: ⚪ **LOW**

#### 10. `template_category_update`
* **What Meta Sends**: When Meta re-classifies your template (e.g., from `UTILITY` to `MARKETING`, or vice versa).
* **Why It Matters**: Marketing templates cost more than Utility templates per conversation in Meta's pricing model.
* **Recommendation**: Log and alert admin so you know if conversation pricing changes.
* **Priority**: 🟡 **HIGH**

#### 11. `template_correct_category_detection`
* **What Meta Sends**: Suggests the recommended category for newly submitted templates based on Meta AI classification.
* **Current Status in What-In**: Logged in `whatsAppWebhookLog`.
* **Priority**: ⚪ **LOW**

---

### Group 3: Phone Number, Account Health & Security

#### 12. `phone_number_quality_update`
* **What Meta Sends**: Fired whenever your phone number's health rating changes (`GREEN / High`, `YELLOW / Medium`, `RED / Low`) or messaging tier changes (e.g. from 10k to 100k or restricted).
* **Current Status in What-In**: What-In displays this rating in the WhatsApp Hub header banner by querying the Graph API periodically.
* **Recommendation**: Listening to this webhook allows real-time instant alerts (e.g. send an alert if quality drops to YELLOW).
* **Priority**: 🟡 **HIGH**

#### 13. `phone_number_name_update`
* **What Meta Sends**: Fired when your requested WhatsApp Display Name (e.g. "Espon Clothing") is approved or rejected by Meta Reviewers.
* **Current Status in What-In**: Your display name is already approved and verified.
* **Priority**: ⚪ **MEDIUM**

#### 14. `account_alerts`
* **What Meta Sends**: Critical business alerts regarding policy violations, impending account bans, or tier reductions.
* **Current Status in What-In**: Logged in raw `whatsAppWebhookLog`.
* **Recommendation**: Trigger high-priority admin push notification upon receiving any `account_alerts`.
* **Priority**: 🟡 **HIGH**

#### 15. `account_update`
* **What Meta Sends**: General updates regarding WABA account status changes (e.g. Active, Suspended, Under Review).
* **Current Status in What-In**: Logged in `whatsAppWebhookLog`.
* **Priority**: 🟡 **HIGH**

#### 16. `account_settings_update`
* **What Meta Sends**: Notification when Two-factor authentication, business compliance, or notification settings are changed.
* **Current Status in What-In**: Logged in `whatsAppWebhookLog`.
* **Priority**: ⚪ **MEDIUM**

#### 17. `account_review_update`
* **What Meta Sends**: Status update when an account appeal or business verification review finishes.
* **Current Status in What-In**: Logged in `whatsAppWebhookLog`.
* **Priority**: ⚪ **MEDIUM**

#### 18. `business_status_update`
* **What Meta Sends**: Fired when your Meta Business Portfolio verification status updates.
* **Current Status in What-In**: Logged in `whatsAppWebhookLog`.
* **Priority**: ⚪ **MEDIUM**

#### 19. `business_capability_update`
* **What Meta Sends**: Triggered when business messaging capabilities (e.g. Catalog access, Payments access, Flows access) are enabled or restricted.
* **Current Status in What-In**: Logged in `whatsAppWebhookLog`.
* **Priority**: ⚪ **MEDIUM**

#### 20. `security`
* **What Meta Sends**: Triggered on suspicious logins, unexpected API token spikes, or security breaches.
* **Current Status in What-In**: Logged in `whatsAppWebhookLog`.
* **Priority**: 🟡 **HIGH**

---

### Group 4: Interactive Flows, Calls & User Preferences

#### 21. `flows`
* **What Meta Sends**: Real-time events from Meta Interactive Flows (JSON forms inside WhatsApp) when a customer opens, navigates, or submits a native flow form.
* **Current Status in What-In**: ✅ **ALREADY IMPLEMENTED**
  * Flows endpoints and decrypt logic are built in `src/app/api/whatsapp/flows/route.ts` and `src/components/whatsapp/WhatsAppFlowsComponent.tsx`.
* **Priority**: 🟡 **HIGH**

#### 22. `calls` (OFF / Unsubscribed)
* **What Meta Sends**: WebRTC voice calling status when a customer taps WhatsApp call button (`ringing`, `answered`, `ended`).
* **Current Status in What-In**: ⚪ **REMOVED FROM CODEBASE**
  * Removed from `src/app/api/whatsapp/webhook/route.ts` as What-In is dedicated to business messaging, CRM automation, templates, and catalogs. WhatsApp WebRTC calling is not used.
* **Recommendation**: **Toggle OFF / Unsubscribe on Meta Webhooks dashboard**.
* **Priority**: ⚪ **NOT NEEDED (Keep OFF)**

#### 23. `automatic_events`
* **What Meta Sends**: Automated trigger notifications generated by Meta AI assistants or commerce triggers.
* **Current Status in What-In**: Logged in `whatsAppWebhookLog`.
* **Priority**: ⚪ **LOW**

#### 24. `tracking_events`
* **What Meta Sends**: Attribution tracking events from Click-to-WhatsApp (CTWA) ad clicks.
* **Current Status in What-In**: Logged in `whatsAppWebhookLog` and mapped in CTWA ad attribution.
* **Priority**: ⚪ **MEDIUM**

#### 25. `user_preferences`
* **What Meta Sends**: Customer opting out of marketing messages (DND / Unsubscribe button clicks).
* **Current Status in What-In**: Displayed on WhatsApp Hub header ("0 Unsubscribed / DND Excluded").
* **Priority**: 🟡 **HIGH**

---

### Group 5: WhatsApp Groups, Commerce & Partner Sync

#### 26. `group_lifecycle_update`
* **What Meta Sends**: When a business WhatsApp group is created, archived, or deleted.
* **What-In Relevance**: What-In focuses on 1-on-1 customer CRM conversations. Groups are not currently used.
* **Priority**: ⚪ **LOW**

#### 27. `group_participants_update`
* **What Meta Sends**: When users join or leave a WhatsApp group.
* **Priority**: ⚪ **LOW**

#### 28. `group_settings_update`
* **What Meta Sends**: Changes to group subject, icon, or permissions.
* **Priority**: ⚪ **LOW**

#### 29. `group_status_update`
* **What Meta Sends**: Group active/inactive status changes.
* **Priority**: ⚪ **LOW**

#### 30. `payment_configuration_update`
* **What Meta Sends**: Status of WhatsApp In-Chat UPI/Payment Gateway onboarding in India.
* **Priority**: ⚪ **MEDIUM** (For future native WhatsApp in-chat payments)

#### 31. `partner_solutions`
* **What Meta Sends**: Events from Meta Solution Providers and BSP integrations.
* **Priority**: ⚪ **LOW**

#### 32. `business_username_updates`
* **What Meta Sends**: When a verified username (@handle) is claimed or changed on WhatsApp.
* **Priority**: ⚪ **LOW**

#### 33. `smb_app_state_sync`
* **What Meta Sends**: Synchronizes state between Cloud API and the WhatsApp Business Mobile App.
* **Priority**: ⚪ **LOW**

---

## 3. Summary: What Is Already Done vs What Is Important

### Already Fully Functional & Production-Ready in Code:
1. ✅ **`messages`**: Text, Images, Video, Documents, Voice Notes, Buttons, List Messages, Location, and Delivery Receipts (Delivered, Read, Failed).
2. ✅ **`message_template_status_update`**: Real-time sync of approved/rejected templates with instant admin notifications.
3. ✅ **`calls`**: Incoming WebRTC call events saved to database.
4. ✅ **`flows`**: WhatsApp native Interactive Forms encryption & data exchange.
5. ✅ **Raw Webhook Logging**: Every single incoming webhook event is preserved in `whatsAppWebhookLog` for audit and debugging.

### Important Real-Time Alerts Recommended:
- Alert admin immediately if `account_alerts` or `phone_number_quality_update` drops to `RED`.
- Update template badge when `message_template_quality_update` or `template_category_update` fires.

---

## 4. Next Step: Moving to Instagram Integration

Now that all WhatsApp Webhook fields have been subscribed and documented in your setup guide, the next step is **Instagram Messaging API**:
- Connecting your Instagram Business account to Meta App.
- Subscribing to Instagram Webhook (`messages`, `messaging_postbacks`).
- Extending What-In Inbox to receive and reply to Instagram DMs.
