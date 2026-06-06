# ☀ Solar CRM — Product Requirements Document (PRD)

**CONFIDENTIAL — INTERNAL USE ONLY** **Version:** 1.0  
**Date:** June 2026  

---

## 1. Executive Summary

This document defines the product requirements for a custom-built **Solar CRM** — an internal sales operations platform built specifically for a solar company that runs door-to-door (D2D) canvassing and cold calling campaigns.

### The Core Problem Today
* **Lack of Standardization:** Reps go out in the field with no standardized way to log what happens at each door.
* **No Territory Controls:** There is no territory management system to prevent street/zone overlap.
* **Management Blindspots:** Management has no real-time visibility into daily field activity. Leads only enter the system if they are explicitly interested, meaning the team has no data on overall conversion rates, common objection patterns, or raw rep performance.

### The Solution
This CRM turns every door knocked and call placed into an actionable data point. Every interaction is cleanly logged, and every follow-up is accurately tracked. Managers gain an instant, live view of the entire team's activities and conversion funnels via a single desktop dashboard. 

Built as a web-first **Progressive Web App (PWA)**, it runs instantly in any mobile browser on day one, while optimizing performance and bypassing app-store friction. A native mobile app is slated for future development phases.

### High-Level Project Scope (v1)

| Aspect | Details |
| :--- | :--- |
| **Scope Focus** | **v1 (Field Sales Tracking)** |
| **In Scope** | Rep accounts, door outcome logging, map-based canvassing, territory assignment, cold call logging, lead pipeline, manager dashboard, daily rep summaries. |
| **Out of Scope** | Proposal/quote generation, billing, installation tracking, native mobile app (all planned for v2+). |
| **Team Size** | 10–30 sales reps, 1 admin/manager. |
| **Channels** | Door-to-door canvassing + cold calling. |
| **Platform** | Web-first PWA — mobile browser optimized for reps, desktop dashboard for the manager. |

---

## 2. Problem Statement

### 2.1 Current State
The sales team currently operates without a centralized platform for tracking field sales. This architecture-less structure leads to three compounding operational bottlenecks:
1. **No Door Outcome Tracking:** Reps only report back when a lead shows solid interest. As a result, the company possesses zero data on rejection reasons, objection patterns, or how many total doors are actually knocked on a given shift.
2. **No Territory Management:** Multiple reps frequently canvas the exact same streets without knowing it, leading to client annoyance, internal friction, and unassigned/uncovered strategic zones.
3. **No Rep Visibility:** Managers are entirely blind to where reps are physically working, how productive their active hours are, or who requires immediate field coaching.

### 2.2 Impact
* **Wasted Operational Velocity:** High rep overlap and missed gaps in target suburbs.
* **Inability to Optimize:** Zero analytics baseline means conversion rates cannot be systematically measured, benchmarked, or improved.
* **Siloed Data:** Cold calling sheets and D2D leads reside in separate, fragmented systems (spreadsheets, personal notes, or memory).
* **Administrative Drag:** Managers spend critical hours chasing reps via messaging apps for spreadsheet updates rather than executing strategy and coaching.

### 2.3 Opportunity
A purpose-built CRM capturing every single door and call outcome transforms the company from **flying blind to being entirely data-driven**. Armed with clean, centralized funnel analytics, leadership can instantly identify which suburbs yield the highest conversion rates, which reps need hands-on support, and which scripts drive high-margin appointments.

---

## 3. Users & Roles

### 3.1 Role Overview

| Role | Target Users | Primary Goals |
| :--- | :--- | :--- |
| **Admin** | Owner / Manager (1) | **Full Operational Visibility:** Access to live tracking maps, all reps' timelines, complete pipeline visibility, daily auto-generated summaries, polygon territory drawing, team KPIs, and account configuration. |
| **Sales Rep** | Field Reps (10–30) | **Frictionless Logging:** Log door outcomes seamlessly on the move, manage personal pipelines, schedule immediate follow-up tasks, and track personal daily metrics. Highly mobile-optimized UX. |

### 3.2 User Journeys

#### Door-to-Door Rep — Typical Shift
1. **Preparation:** Opens the PWA on their phone at the start of a shift and checks their highlighted assigned territory polygon.
2. **Clock-In:** Taps "Start Shift," initializing the background GPS tracker trail.
3. **Field Activity:** Walks up to a house and knocks. Taps the building directly on the map view (or utilizes a quick-add overlay) to open the outcome form.
4. **Log Outcome:** Selects one of the 6 fast outcome options:
   * *Interested*
   * *Not Home*
   * *Not Interested*
   * *Do Not Knock*
   * *Callback Requested*
   * *Already Has Solar*
5. **Lead Conversion:** If the outcome is marked **Interested**, the app instantly spins up a pipeline lead card. The rep adds quick notes and schedules a follow-up date.
6. **Clock-Out:** Concludes the shift; the system processes data and routes a clean daily summary to both the rep and the manager.

#### Cold Calling Rep — Typical Session
1. Opens the desktop/tablet interface and navigates to the **Calls** panel.
2. Searches for a baseline contact by name, phone, or address. If non-existent, clicks a unified quick-add button.
3. Places the call and inputs details: outcome enum, manual duration tracking, descriptive notes, and next follow-up milestone.
4. If marked **Interested**, converts the record with a single tap into a live lead card inside the exact same core pipeline used by the field canvassing team.

#### Manager — Morning Routine
1. Launches the desktop CRM dashboard over morning coffee. Reviews yesterday’s aggregated performance index: total doors knocked, cold calls made, new leads added, and appointments successfully locked.
2. Evaluates the live team map to inspect active territory allocations and verify perimeter coverages.
3. Reviews flagged records, high-priority pipelines, or reps showing unusually low activity logs to plan targeted coaching sessions.

---

## 4. Feature Requirements

### 4.1 Module Overview
The Solar CRM architecture splits into six core operational modules running over a **single, unified data layer**. Whether a record originates from an physical door knock or an outbound phone queue, it bridges to the same core Contact data scheme to maximize historic tracking.

### Module 1 — Authentication & Rep Management
*Controls user session security, access profiles, and basic team permissions.*

| Feature | Description | Priority | Phase |
| :--- | :--- | :--- | :--- |
| **Email/Password Login** | Secure login utilizing JWT sessions. Reps are constrained to personal data partitions; admins have unrestricted read/write configurations. | Must Have | v1 |
| **Role-Based Access (RBAC)**| Explicit system roles: Admin (unrestricted) and Rep (personal data access only). No complex hierarchy nesting needed for v1. | Must Have | v1 |
| **Rep Profile Setup** | Capture fields: Name, phone number, assigned territory link (optional), start date, and status flag (`active` / `inactive`). | Must Have | v1 |
| **Admin User Management** | Admin capability to provision new accounts, instantly deactivate departing reps, and force password resets. | Must Have | v1 |
| **Session Persistence** | Persistent sessions on mobile browsers so field reps aren't forced to re-authenticate repeatedly mid-shift. | Must Have | v1 |
| **Password Reset** | Automated email-based link reset workflow. | Should Have | v1 |
| **Invite via Link** | Admin generates a secure registration link; incoming reps click to initialize password setup on first onboarding. | Should Have | v1 |

### Module 2 — Field Canvassing (D2D Map)
*The system's core transactional UI. Houses knocked map to color-coded geometric pins.*

| Feature | Description | Priority | Phase |
| :--- | :--- | :--- | :--- |
| **Interactive Map View** | Mapbox GL JS base layer. Reps view accurate current GPS location markers alongside historic outcome pins rendered with high mobile fluidity. | Must Have | v1 |
| **Tap to Log a Knock** | Direct-tap interaction on map parcels or single-tap GPS snapping to nearest address coordinates to invoke the outcome sheet. | Must Have | v1 |
| **Door Outcome Form** | High-velocity micro-form: Status selector + optional free-text Notes + optional Follow-up date picker. Submission targeted at `< 10 seconds`. | Must Have | v1 |
| **Unified Status Options** | Strictly enforced 6-status enum:  <br>• **Interested** (Green) <br>• **Not Home** (Yellow) <br>• **Not Interested** (Red) <br>• **Callback Requested** (Blue) <br>• **Do Not Knock** (Dark Gray) <br>• **Already Has Solar** (Purple) | Must Have | v1 |
| **Color-Coded Pins** | Dynamic rendering of localized maps showing historical color pins. Provides instant visualization of street coverage. | Must Have | v1 |
| **Offline Mode Architecture**| Local save state using IndexedDB when cell service drops. Auto-background syncing triggers once connection resolves to protect data integrity. | Must Have | v1 |
| **Address Auto-Fill** | Instant coordinate conversion to standard postal address via reverse geocoding API. Rep reviews and confirms. | Must Have | v1 |
| **One-Tap Lead Promotion** | Marking a door as *Interested* or *Callback Requested* enables instant card conversion to pipeline tracking. | Must Have | v1 |
| **Personal Logs History** | Rep-facing history lists to audit past knocks, filterable by targeted dates and outcome statuses. | Should Have | v1 |
| **Admin Global Map View** | Manager-level global map overlay tracking all historical pins. Configured with fast multi-select filters for rep, date, and status. | Must Have | v1 |
| **Duplicate Alert System** | System check warning a rep if a selected parcel has already been knocked on that current date by another team member. | Should Have | v1 |
| **Street View Deep Link** | Native quick-link hook pointing out to Google Street View to inspect specific architectural or roof properties. | Nice to Have | v2 |

### Module 3 — Territory Management
*Allows managers to draw and assign geofenced zones to prevent layout overlapping.*

| Feature | Description | Priority | Phase |
| :--- | :--- | :--- | :--- |
| **Territory Creation UI** | Admin tool to draw bounding polygon zones dynamically over the map layer (freehand boundary drawing or suburb/postcode snapping). | Must Have | v1 |
| **Rep Territory Assignment** | Links specific polygon zones to designated reps bound to specific operational dates or calendar windows. | Must Have | v1 |
| **Zone Map Highlighting** | Assigned active territories render as distinct translucent bounding boxes on the rep’s field view upon shift initialization. | Must Have | v1 |
| **Coverage Heatmaps** | Variable alpha opacity layer indicating knock density maps (uncovering heavily worked areas vs neglected pockets). | Should Have | v1 |
| **Territory Meta Notes** | Text append fields on zones for manager context (e.g., *"High income zone - avoid morning canvas,"* *"Strict HOA regulations"*). | Should Have | v1 |
| **Historical Logs Audit** | Full audit timeline engine detailing past zone owners and historical production outputs across set periods. | Nice to Have | v2 |

### Module 4 — Cold Calling
*Outbound performance tracker integrating directly into the centralized lead funnel.*

| Feature | Description | Priority | Phase |
| :--- | :--- | :--- | :--- |
| **Contact Search / Create** | Global indexing engine to search records by name, phone string, or address fields. Prevents double entry. | Must Have | v1 |
| **Call Log Entry Panel** | Manual tracking sheet capturing: associated contact, call status enum, manual duration entry, summary notes, and next follow-up. | Must Have | v1 |
| **Call Outcome Enums** | Defined call outcome keys: *Answered – Interested*, *Answered – Not Interested*, *Voicemail*, *No Answer*, *Wrong Number*, *Callback Scheduled*. | Must Have | v1 |
| **Pipeline Promotion Step** | If a call registers *Interested* or *Callback Scheduled*, a single click generates a live pipeline card. | Must Have | v1 |
| **Contact Activity Stream** | Complete inline history component display showing every past call note tied to the specific contact record. | Must Have | v1 |
| **Daily Call Counters** | Real-time counter metrics visible on rep dashboard panels. Aggregates instantly onto the manager index. | Must Have | v1 |
| **Dynamic Script Prompt** | Collapsible administrative script interface widget pulling from admin settings to guide reps on active calls. | Should Have | v1 |
| **Click-to-Call Linkages** | Protocol handler integration (`tel:`) allowing reps to instantly trigger default device dialers via touch. | Should Have | v1 |
| **Bulk Contact Importing** | CSV processing engine ingestion to parse data sheets and auto-distribute call lines out to the rep queues. | Nice to Have | v2 |

### Module 5 — Lead Pipeline
*Unified visual tracking pipeline managing customer milestones from both capture channels.*

| Feature | Description | Priority | Phase |
| :--- | :--- | :--- | :--- |
| **Kanban Pipeline Board** | Interactive drag-and-drop workflow tracking leads through standard phases:  <br>`Knocked/Called` → `Interested` → `Appointment Set` → `Pitched` → `Proposal Sent` → `Signed` → `Lost` | Must Have | v1 |
| **Lead Card Miniatures** | Summary cards showing: contact full name, primary address, acquisition channel (D2D vs Call), owner name, last touch date, and next action countdown. | Must Have | v1 |
| **Lead Detail View** | Deep comprehensive 360-degree panel compiling every linked knock, dial, note, state change, and scheduled follow-up event. | Must Have | v1 |
| **Follow-Up Engine** | Date/Time assignment selector allowing reps to program callbacks. Fires push reminder protocols directly to the mobile browser. | Must Have | v1 |
| **Collaboration Notes** | Unified rich text comment threads allowing field reps and managing admins to coordinate inside specific leads. | Must Have | v1 |
| **Channel Source Tagging** | Strict database logging enforcing origin tracing (`D2D` vs `Cold Call`) along with creator employee signatures. | Must Have | v1 |
| **Global Grid Filters** | Multifaceted processing filters to view pipeline state by stage, owner name, initial channel, target suburb, or date range. | Must Have | v1 |
| **Lead Reassignment** | Manager tool to reallocate leads between team members to manage workload distribution. | Should Have | v1 |
| **Audit Log Trail** | Permanent tracking table detailing timeline histories of card movements (tracking actor ID, origin column, target column, and precision timestamp). | Should Have | v1 |
| **Lost Reason Enforcement** | Enforces selection of loss reason enums when moving cards to the `Lost` column (*Price*, *Not interested*, *Competitor*, *No response*). | Should Have | v1 |
| **Integrated Comms (SMS/Mail)**| Communication gateway to dispatch prefabricated SMS templates or emails natively out from lead profile buttons. | Nice to Have | v2 |

### Module 6 — Manager Dashboard & Rep Tracking
*The central web interface designed for comprehensive operational intelligence.*

| Feature | Description | Priority | Phase |
| :--- | :--- | :--- | :--- |
| **Live Activity Feed** | High-velocity activity stream rendering real-time events (e.g., *"Rep X logged Interested door on Street Y"*) without requiring manual page refreshes. | Must Have | v1 |
| **Daily Rep Summary Grid** | Tabular workspace monitoring live rep outputs: doors hit, numbers dialed, pipeline leads added, and appointments confirmed. Resets nightly. | Must Have | v1 |
| **Team Leaderboard Widget**| Ranking layout comparing rep outputs across configurable timeframes (weekly, monthly, custom). Helps gamify sales goals. | Must Have | v1 |
| **GPS Shift Breadcrumbs** | Renders clear geospatial polyline paths on the admin map tracking rep field movements across their active shifts. | Must Have | v1 |
| **Funnel Conversion Chart** | Step-down visual analytics tracking absolute conversions: `Total Interacted` → `Interested` → `Appt Set` → `Pitched` → `Closed-Won`. Exposes process leakage. | Must Have | v1 |
| **Rep Deep Dive Views** | Individual dossier overlays highlighting personal historical performance charts, current pipelines, and long-term trends. | Must Have | v1 |
| **Global Date Engine** | Controls dashboard metrics across unified date boundaries (*Today*, *This Week*, *This Month*, *Custom Pickers*). | Must Have | v1 |
| **Geographic Yield Analytics**| Suburb-by-suburb conversion charts pinpointing which regional boundaries produce the highest concentration of positive conversions. | Should Have | v1 |
| **Automated CSV Exporter** | Data engine rendering immediate table extractions to structured `.csv` files for legacy storage or custom workbook models. | Should Have | v1 |
| **Weekly Digest Dispatch** | Schedule runner parsing metrics every Monday morning to dispatch high-level PDF operation summaries to the owner’s inbox. | Should Have | v2 |
| **Inactivity Guard Alerts** | Automated monitoring engine firing dashboard alerts if an on-duty rep fails to register an active operation for more than X consecutive hours. | Nice to Have | v2 |

---

## 5. Data Model Overview

The backend uses a strongly typed relational schema powered by PostgreSQL with PostGIS extensions. Everything scales around a single, unified `Contact` entity to ensure historic notes are preserved across all touchpoints.

```
          +-------------------+
          |       User        |
          +-------------------+
                    | (1)
                    |
                    | (N)
          +-------------------+
          |      GpsPing      |
          +-------------------+

          +-------------------+          +-------------------+
          |     Territory     |--------->|TerritoryAssignment|
          +-------------------+ (1)  (N) +-------------------+

                               +-------------------+
                               |      Contact      |
                               +-------------------+
                                 /       |                                     1 /       1|        \ 1
                               /         |                                      N/         N|          \ N
                     +-----------+ +-----------+ +-----------+
                     | DoorKnock | |  CallLog  | |   Lead    |
                     +-----------+ +-----------+ +-----------+
                                                   /                                                       1 /         \ 1
                                                 /                                                          N/             \ N
                                       +--------------+ +------------+
                                       | LeadActivity | |  FollowUp  |
                                       +--------------+ +------------+
```

### Entity Schemas & Key Fields

#### 1. `User`
Tracks individual authorization properties and assigned internal roles.
* `id` (UUID, PK)
* `name` (VARCHAR)
* `email` (VARCHAR, Unique)
* `password_hash` (TEXT)
* `role` (ENUM: `admin`, `rep`)
* `territory_id` (UUID, FK, Optional)
* `active` (BOOLEAN)
* `created_at` (TIMESTAMP)

#### 2. `Territory`
Defines polygon map shapes for sales zones using spatial geometry data.
* `id` (UUID, PK)
* `name` (VARCHAR)
* `polygon_geojson` (GEOMETRY: Polygon, SRID 4326)
* `notes` (TEXT)
* `created_by_admin_id` (UUID, FK)

#### 3. `TerritoryAssignment`
Maps specific territories to field reps for explicit dates.
* `id` (UUID, PK)
* `territory_id` (UUID, FK)
* `rep_id` (UUID, FK)
* `assigned_date` (DATE)
* `assigned_by` (UUID, FK)

#### 4. `Contact`
The central hub for data records. Houses core identity and geographical data.
* `id` (UUID, PK)
* `first_name` (VARCHAR, Optional)
* `last_name` (VARCHAR, Optional)
* `phone` (VARCHAR, Index)
* `email` (VARCHAR)
* `address` (TEXT)
* `suburb` (VARCHAR)
* `postcode` (VARCHAR)
* `lat` (NUMERIC)
* `lng` (NUMERIC)
* `created_at` (TIMESTAMP)

#### 5. `DoorKnock`
Logs transactional data for a single physical door interaction.
* `id` (UUID, PK)
* `contact_id` (UUID, FK)
* `rep_id` (UUID, FK)
* `outcome` (ENUM: `interested`, `not_home`, `not_interested`, `do_not_knock`, `callback_requested`, `already_has_solar`)
* `notes` (TEXT)
* `knocked_at` (TIMESTAMP)
* `lat` (NUMERIC)
* `lng` (NUMERIC)
* `synced` (BOOLEAN) -> *Offline processing flag*

#### 6. `CallLog`
Logs details for a single telephone outreach interaction.
* `id` (UUID, PK)
* `contact_id` (UUID, FK)
* `rep_id` (UUID, FK)
* `outcome` (ENUM: `answered_interested`, `answered_not_interested`, `voicemail`, `no_answer`, `wrong_number`, `callback_scheduled`)
* `duration_seconds` (INTEGER)
* `notes` (TEXT)
* `called_at` (TIMESTAMP)
* `follow_up_at` (TIMESTAMP, Optional)

#### 7. `Lead`
The state record managing active sales opportunities in the pipeline.
* `id` (UUID, PK)
* `contact_id` (UUID, FK)
* `rep_id` (UUID, FK)
* `source` (ENUM: `d2d`, `call`)
* `stage` (ENUM: `knocked_called`, `interested`, `appointment_set`, `pitched`, `proposal_sent`, `signed`, `lost`)
* `door_knock_id` (UUID, FK, Optional)
* `call_log_id` (UUID, FK, Optional)
* `created_at` (TIMESTAMP)
* `updated_at` (TIMESTAMP)

#### 8. `LeadActivity`
An immutable history log tracking notes and pipeline stage changes.
* `id` (UUID, PK)
* `lead_id` (UUID, FK)
* `actor_id` (UUID, FK)
* `type` (ENUM: `note`, `stage_change`, `call`, `knock`)
* `content` (TEXT)
* `created_at` (TIMESTAMP)

#### 9. `FollowUp`
Tracks reminders and tasks associated with a lead.
* `id` (UUID, PK)
* `lead_id` (UUID, FK)
* `rep_id` (UUID, FK)
* `due_at` (TIMESTAMP)
* `note` (TEXT)
* `completed` (BOOLEAN)
* `created_at` (TIMESTAMP)

#### 10. `GpsPing`
Stores location history data points to reconstruct field rep shift routes.
* `id` (UUID, PK)
* `rep_id` (UUID, FK)
* `lat` (NUMERIC)
* `lng` (NUMERIC)
* `recorded_at` (TIMESTAMP) -> *Logged every ~2 minutes during active shifts*

---

## 6. Recommended Tech Stack

| Layer | Selected Tech | Architecture Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 14 (App Router) + React** | Eliminates boilerplate. Leverages modern server component capabilities while ensuring fast mobile rendering. `next-pwa` integration provides robust out-of-the-box service worker support for offline usage. |
| **Styling Engine** | **Tailwind CSS** | Facilitates swift, mobile-first responsive UI construction. Simplifies implementation of dense, one-handed touch overlays over map states. |
| **Mapping Engine** | **Mapbox GL JS** | Delivers efficient client-side vector pin clustering and custom map styles. Cost structures scale more predictably than Google Maps alternatives for deep data visualization. |
| **Backend & APIs** | **Next.js API Routes (Node.js)** | Keeps infrastructure unified. Next.js API endpoints minimize dev-ops overhead for version 1, with an easy path to separate Express servers later if compute demands grow. |
| **Database Architecture** | **PostgreSQL + PostGIS** | Essential for mapping requirements. PostGIS allows spatial queries out-of-the-box (e.g., assessing if a knock coordinate intersects an active territory polygon boundary). |
| **BaaS & Realtime Provider** | **Supabase** | Acceleration engine. Bundles managed Postgres database, built-in row-level security (RLS) policies, authentication systems, and automated websocket event synchronization into a unified developer platform. |
| **Realtime Syncer** | **Supabase Realtime** | Drives the manager’s live activity feed by instantly broadcasting database mutation events to client views without continuous polling overhead. |
| **Offline Processing Store** | **Workbox (Service Worker) + IndexedDB** | Captures knock entries locally inside IndexedDB instances during cellular dropouts, safely firing background queues when network connectivity recovers. |
| **Geospatial Hardware Link** | **Browser Geolocation API** | Bypasses app store friction. Leverages standard HTML5 location services in Mobile Safari and Chrome, running background intervals upon shift activation. |
| **Hosting Infrastructure** | **Vercel + Supabase Managed Cloud** | Zero-downtime deployment workflows tailored for Next.js architectures, with a scalable backend layer capable of easily sustaining early growth phases. |

---

## 7. Phased Roadmap

### Phase 1 — Foundation & Field Mapping (Weeks 1–4)
* **Goal:** Enable field reps to log interactions seamlessly and ensure managers have basic visibility into daily activity.
* Build secure JWT authentication, assign platform roles (`Admin` vs `Rep`), and configure data schemas inside Supabase.
* Implement the primary Mapbox UI component, hook into the HTML5 Geolocation tracking layer, and build large-touch color pins.
* Build the rapid door outcome logging form with background IndexedDB persistence layers to guard against field data loss.
* Establish basic admin layout screens allowing managers to track incoming pins filtered by date parameters.

### Phase 2 — Lead Funnels & Communication (Weeks 5–8)
* **Goal:** Centralize lead capture from both sales channels into a unified pipeline management workflow.
* Launch the core drag-and-drop Kanban Pipeline board, complete with automated activity logs and loss reason tracking.
* Deliver the outbound Call Logging suite, featuring unified contact indexing tools and inline layout script helpers.
* Introduce the primary Territory Management drawing kit, allowing admins to establish geofenced boundaries and assign them across date ranges.
* Configure Service Worker Push Notification gateways to route timely task reminders straight to rep lockscreens.

### Phase 3 — Analytics & Performance Engine (Weeks 9–12)
* **Goal:** Unlock data-driven insights from aggregated sales metrics to help optimize conversion rates.
* Launch advanced manager analytics boards featuring conversion funnel diagnostics, team productivity leaderboards, and automated shift breadcrumb tracing.
* Build spatial aggregation metrics to identify high-converting geographic zones and suburbs.
* Add one-click automated `.csv` data extraction support across all core analytical tables.
* Implement collapsible administrative call scripts that auto-surface during active dialing queues.

### Phase 4 — Next-Gen Scale (Post-Launch v2+)
* **Goal:** Optimize performance and extend the platform's core functional scope based on real-world usage.
* Move from standard PWA configurations to compiling a compiled native app interface using React Native to ensure more reliable background location tracking.
* Build a native PDF proposal creation engine to allow reps to build and send solar quotes directly from the field.
* Integrate twilio/sendgrid hooks to support template-driven SMS and email outreach directly from lead records.
* Automate background workers to process data aggregates and email weekly operation PDF wrap-ups to leadership every Monday morning.

---

## 8. Non-Functional Requirements

### 8.1 Performance
* **Map Fluidity:** Map view components must cluster and render up to 500 localized vector pins within 2 seconds of load.
* **Form Latency:** Door log submissions must complete server handshakes in `< 1 second` under standard 4G connections.
* **Dashboard Responsiveness:** The desktop management console must aggregate data points and render views in under 3 seconds.
* **Offline Resiliency:** The PWA must support full shift workflows without active internet connections, completing background cache syncs within 30 seconds of restoring cell service.

### 8.2 Mobile Experience
* **Ergonomics:** All field rep screens must be designed for easy, single-thumb layout interaction to accommodate users walking in real-world environments.
* **Hit Targets:** Interactive buttons, selectors, and form elements must adhere to a minimum hit box area of `44 × 44px`.
* **Power Consumption:** GPS ping routines must run at an optimized interval of roughly 2 minutes to conserve battery life during long shifts.
* **Zero-Install Deployment:** The system must function reliably across Mobile Safari (iOS) and Mobile Chrome (Android) without requiring native app wrapper installations.

### 8.3 Security
* **Data Access Integrity:** All API routes must enforce strict JWT token validation. Internal database row-level security (RLS) rules must prevent reps from reading or modifying data belonging to other team members.
* **Server Verification:** Critical administrative operations must enforce role checks on the server side; client-side route protection is insufficient.
* **Storage Encryption:** Personally Identifiable Information (PII) must be encrypted before being written to persistent local storage arrays like IndexedDB or localStorage.
* **Transport Layer Protection:** HTTPS configurations must be strictly enforced across all application environments.

### 8.4 Reliability
* **Availability Thresholds:** Target service availability is pinned at `99.5%` uptime across hosting platforms.
* **Data Loss Prevention:** Offline local data engines must ensure zero field transaction data drops during coverage loss.
* **Backup Strategy:** Supabase configurations must execute automated point-in-time snapshot database backups every 24 hours.

---

## 9. Success Metrics

Progress and product adoption will be benchmarked at 30, 60, and 90-day intervals following initial deployment.

| Metric | Targeted Objective | Strategic Objective |
| :--- | :--- | :--- |
| **Active Field Logging** | `90%+` of active roster reps logging doors daily. | **Product Adoption:** The CRM only works if reps regularly feed data into the core system. |
| **Log Volume Benchmark** | Establish a baseline volume index within Week 1. | **Productivity Tracking:** Sets clear performance benchmarks for field shifts. |
| **Funnel Visibility** | Map complete door-to-interest percentages within 30 days. | **Process Optimization:** You can't systematically optimize what you don't actively measure. |
| **Territory Overlap Reduction** | Drive territory overlap incidents down to `< 5%` of total logs. | **System Validation:** Verifies that the map assignment system successfully eliminates double-knocking. |
| **Manager Efficiency** | Reduce time spent gathering status updates down to `0 hours` via the self-serve dashboard. | **Administrative Optimization:** Frees up leadership to focus on strategy and coaching rather than chasing updates. |
| **Pipeline Velocity** | Track baseline lead stage-to-close timelines and establish a downward trend. | **Pipeline Health:** Provides a clear early indicator of sales process health. |

---

## 10. Open Questions & Decisions

| Open Challenge | Evaluated Structural Options | Recommended Architectural Path |
| :--- | :--- | :--- |
| **1. Primary Maps Provider Selection** | • **Google Maps:** Familiar maps integration, native Street View. <br>• **Mapbox GL JS:** Lower scale costs, deep style control, high canvas speed. | **Mapbox GL JS:** Provides a generous developer tier, robust vector performance on mobile web instances, and highly customizable map themes that make data pins pop. |
| **2. Core API Architecture** | • **Next.js Serverless Routes:** Fast, unified code setup. <br>• **Dedicated Express Framework Instance:** Better for persistent workers. | **Next.js API Routes for v1:** Keeps early development simple and fast. Code can be refactored into an independent Express architecture later if complex background job workers are introduced. |
| **3. Shift Monitoring Control** | • **Passive Background GPS Polling:** Automated, high battery drain risk. <br>• **Explicit Shift Actions (Clock-In/Out):** Simple button triggers. | **Explicit Start/End Shift Action:** A prominent button click handles shift context adjustments, initiates standard location loops, and safely resets daily metric counters. |
| **4. Door Label Customization** | • Accept current suggested enums. <br>• Perform granular stakeholder adjustment rounds. | **Lock in Enums in Week 1:** Review labels with field teams early. Enums must be finalized before database generation, as subsequent schema migrations can create friction down the line. |
| **5. Historical Re-visits Handling** | • Hard-block subsequent entries on known records. <br>• Allow unrestricted data stacking. <br>• Trigger warnings while exposing past logs context. | **Warn and Surface Historical context:** Inform reps if a address has a prior log entry, but allow them to overwrite or append to it. This accommodates team members re-knocking doors where prospects weren't home earlier in the day. |

---
*Solar CRM PRD v1.0 — Confidential Document Asset — Managed Sales Operations Engineering Suite.*