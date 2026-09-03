# WrectifAI Complete Production Handover

## 1. Project Overview
WrectifAI is an automotive service ecosystem connecting Customers, Garages, and Admins. The platform provides AI-driven car diagnostics, garage discovery, service bookings, part orders, quoting, promotions, and secure payments via Razorpay.

**Architecture**
- **Backend API**: Node.js v22 (Express, Nx, esbuild)
- **Database**: PostgreSQL (Raw SQL queries, no ORM)
- **Frontend Web**: Next.js (React)
- **Frontend Mobile**: React Native (Expo)

\\\mermaid
flowchart TD
    Customer(Customer) -->|Web/Mobile| WebFrontend(Frontend Applications)
    Garage(Garage) -->|Web Portal| WebFrontend
    Admin(Admin) -->|Admin Portal| WebFrontend
    
    WebFrontend -->|REST API - /api/v1| Backend(Node.js / Express API)
    
    Backend -->|Raw SQL| Postgres[(PostgreSQL)]
    Backend -->|Payments/Webhooks| Razorpay(Razorpay API)
    Backend -->|AI/Images| AI_Groq_Vision(AI Services)
\\\

## 2. Complete Role Architecture

| Feature | Customer | Garage | Admin |
| :--- | :--- | :--- | :--- |
| **Authentication** | Login, Register, Profile, Vehicles | Login, Register, Profile | Login, Manage Users |
| **Garages** | Discover, Search, View Details, Reviews | Manage Profile, Verification | Approve/Reject Garages |
| **Diagnostics** | Run AI Diagnostics, Save History | View Customer Diagnosis (Quotes) | View System Stats |
| **Quotes** | Request Quotes, Accept, Reject | Receive Requests, Submit Estimates | View Quotes/Stats |
| **Bookings** | Create, Pay (Razorpay/Wallet/Cash) | Manage Incoming, Confirm Service, Confirm Cash | View Bookings |
| **Wallet** | Add Funds, View Balance, Transactions | N/A | Manage Config |
| **Orders/Products**| Order Parts, Track Delivery | Manage Inventory, Fulfill Orders | Manage Platform Catalog |
| **Offers & Promos**| View, Apply to Bookings | Create Offers/Combo Deals, Manage | Manage/Monitor |
| **Refunds** | Request Refund for Paid Booking | Approve/Reject/Request Info | View Refund Requests |
| **Referrals** | Earn via Links/Codes | N/A | Configure Regional Rewards |
| **Reviews** | Submit, Upvote | Reply, View | Hide/Moderate |
| **Notifications** | Receive via DB/Channel, Read | Receive via DB/Channel, Read | Send/Manage |

## 3. Customer Side — Complete Feature Documentation
- **Home/Dashboard**: Quick actions, recent vehicles, active bookings.
- **WrectifAI Diagnose**: Upload symptoms/media, receive AI diagnosis, generates \diagnosis_requests\ and \diagnosis_results\.
- **Garages & Discovery**: Browse approved garages, filter by location (Region/City matching in DB).
- **Vehicles**: Add, edit, soft delete vehicles, view repair history.
- **Quotes**: Request repair estimates based on diagnosis, compare received quotes.
- **Bookings**: Schedule service, track status (\pending\, \confirmed\, \in_progress\, \completed\, \eadyForCollection\, \collected\). Can apply offers or pay via Wallet/Razorpay. Cash payments require garage confirmation.
- **Wallet & Payments**: Add funds, view ledger transactions (\walletRouter\, \paymentsRouter\).
- **Orders (Shop)**: Purchase parts (\productsRouter\, \ordersRouter\).
- **Refer & Earn**: Share links, earn wallet credits upon successful referral bookings.
- **Refunds**: Request refund post-payment if issues arise.
- **Reviews**: Leave ratings (Overall, Price, Quality, Time, Behavior). Comments are optional.

## 4. Garage Side — Complete Feature Documentation
- **Registration/Onboarding**: Submits documents for verification, waits for Admin approval.
- **Profile & Settings**: Manage business hours, specializations, locations.
- **Incoming Quotes**: Review customer requests, submit pricing/ETA (\quotesRouter\).
- **Booking Management**: Accept/Decline bookings, mark service stages, confirm cash payments (\confirm-cash\).
- **Inventory/Services**: Manage own services and inventory. Can request new platform catalog items from Admin.
- **Offers & Combo Deals**: Create Garage-specific offers and seasonal combo deals (\garageOffersRouter\).
- **Refund Requests**: Decide on customer refund requests (Approve/Reject/Request Info).
- **Reviews**: View and reply to customer reviews.

## 5. Admin Side — Complete Control Documentation
- **Dashboard/Stats**: View platform-wide statistics.
- **User Management**: View users, change status, delete.
- **Garage Management**: Review onboarding garages, approve/reject verifications.
- **Catalog Management**: Approve/reject garage requests for new services/inventory items.
- **Referrals Configuration**: Configure referral reward amounts and criteria by region/currency.
- **Booking/Quotes Audit**: View all transactions, no direct intervention in standard garage flows unless needed for moderation.
- **Review Moderation**: Can hide reviews (\PATCH /reviews/:reviewId/hide\).

## 6. Admin -> Garage -> Customer Relationship

\\\mermaid
flowchart TD
    subgraph ADMIN
    A[Admin Configuration] --> B[Approve Garage]
    A --> C[Platform Catalog/Services]
    end
    
    subgraph GARAGE
    B --> D[Garage Activated]
    C --> E[Garage Selects/Requests Services]
    D --> F[Garage Creates Offers/Quotes]
    end
    
    subgraph CUSTOMER
    E --> G[Customer Sees Services]
    F --> H[Customer Books/Pays]
    end
\\\

## 7. Booking Lifecycle

\\\mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Confirmed : Garage Accepts
    Confirmed --> In_Progress : Service Started
    In_Progress --> Completed : Service Finished (Invoice Generated)
    Completed --> Paid : Customer Pays (Online/Wallet)
    Completed --> ReadyForCollection : Waiting for Cash/Pickup
    ReadyForCollection --> Paid : Garage Confirms Cash
    Paid --> Collected : Customer Collects
    Collected --> [*]
\\\

- **Invoicing**: Occurs upon service completion.
- **Payment**: Made after completion (or optionally during, depending on flow). Cash requires explicit Garage confirmation (\confirm-cash\).

## 8. Payment Architecture
- **Razorpay**: Used for primary fiat processing. Backend generates Order ID.
- **Idempotency**: \	ransaction_id\ enforced on \payments\ table to prevent double-charging.
- **Webhooks**: \/payments/webhook\ processes async state updates.
- **Cash**: Customer selects cash (\select-cash\), garage confirms (\confirm-cash\).
- **Wallet**: Customers can pay via Wallet balance, handled via atomic SQL transactions.

## 9. Wallet Architecture
- **Ledger**: Wallet balance is calculated dynamically or stored via transactional updates upon Top-up, Payment, or Referral Reward.
- **Transactions**: Tracked in database (add-funds, verify-topup).

## 10. Refer & Earn Architecture
- **Flow**: User A shares link -> User B registers -> User B completes a paid booking -> System calculates reward -> Credits User A's wallet.
- **Admin**: Configures rewards based on region (e.g. INR vs USD).

## 11. Offers & Promos vs Seasonal Combo Deals
- **Offers**: Standard percentage/flat discounts created by Garage, validated at booking/payment checkout.
- **Seasonal Combo Deals (\promos\)**: Packaged multi-service deals, regional scoped (e.g., India vs USA), managed by Garages. Visible on Customer Deals page.

## 12. Currency & Location Architecture
- **Location**: Garages store rich location JSON (\city\, \state\, \country\, \postal_code\).
- **Currency Resolution**: Resolved strictly based on Garage's country (e.g., \in\ -> INR, \us\ -> USD, \e\ -> AED). 
- **Isolation**: Customers only see promos/garages from their matched region (enforced in backend SQL queries).

## 13. Database Architecture (Key Tables)
- \users\, \oles\, \user_roles\: RBAC system.
- \garages\, \garage_documents\, \garage_services\: Garage profiles and offerings.
- \ehicles\, \ehicle_repair_history\: Customer assets.
- \diagnosis_requests\, \diagnosis_results\: AI Diagnostics engine.
- \ookings\, \quotes\, \invoices\, \payments\: Core marketplace transactional flow.
- \efund_requests\: Manages refund state machine.
- \promos\, \offers\(via garage_offers routes): Marketing logic.

## 14. API Documentation (Key Endpoints)
- \uth\: \/login\, \/register\, \/refresh\, \/google\
- \ookings\: \POST /instant\, \POST /from-quote/:quoteId\, \POST /:id/pay\, \POST /:id/confirm-cash\
- \quotes\: \POST /requests\, \POST /garage-requests/:id/accept\
- \garages\: \GET /search\, \POST /onboarding\
- \payments\: \POST /orders\, \POST /verify\, \POST /webhook\
- \wallet\: \POST /add-funds\, \GET /balance\
- \efunds\: \POST /bookings/:id/refund-requests\, \POST /garages/refund-requests/:id/approve\

*(Total actual routes implemented in codebase: ~159 endpoints.)*

## 15. Authentication & Security
- **JWT**: Access and Refresh tokens used. 
- **RBAC**: \uthenticate\ and \equireRole\ middleware enforces route protection based on DB \user_roles\.
- **Garage Isolation**: Backend strictly checks \eq.user.garageId\ against the requested resource's \garage_id\ to prevent Garage A from seeing Garage B's data.

## 16. Notification Architecture
- DB-persisted notifications (\
otifications\ table).
- Routes to mark as read/read-all.

## 17. Review Architecture
- Ratings mapped 1-5 for Overall, Price, Quality, Time, Behavior.
- Comments are optional.
- Admin can \hide\ inappropriate reviews. Garages can \eply\.

## 18. Deployment & Testing Architecture
- **Environment**: Node.js/Docker via \docker-compose.yml\ for DB. Nx commands for building.
- **Variables**: Managed via \.env\ (RAZORPAY_KEY_ID, DATABASE_URL). *Secrets are omitted from documentation.*
- **Tests**: Monorepo utilizes Nx testing (Jest/Vitest) primarily for API/Unit tests (\	est:api:unit\).
- **Mock External Services**: Third-party APIs (Stripe/Razorpay, Groq) are mocked in tests.

## 19. Demo / Test Users
- **Customer**: \9876543210\ / OTP: \123456\
- **Admin**: \ 000000000\ / OTP: \123456\
- **Garages**: (12 seed garages including 'Metro Auto Bay', 'Speed Motors') 
  - Phone format: \9999999901\ to \9999999912\
  - OTP: \123456\
*(These are test-only credentials documented in codebase for local seeding.)*

## 20. Business Rules
- **No Automatic Payment**: Booking creation does not debit funds immediately; payment strictly follows service completion/invoice generation.
- **Cash Payments**: Requires garage to explicitly confirm receipt via backend endpoint before marking PAID.
- **Regional Isolation**: USA garages and INR promos do not mix. Backend scopes queries by country code.

## 21. Limitations / Known Issues
- Partially implemented: Product Deliveries (API exists but lacks full carrier integration).
- Real-time Notifications: Currently DB polling/REST based; WebSockets not fully fleshed out for all events.
- Test Coverage: Needs expansion for Edge Cases in Wallet ledger concurrency.

## 22. Final Architecture Summary
WrectifAI uses a highly decoupled, strictly RBAC-enforced monolithic API powered by raw SQL for performance. The frontend applications (Next.js/Expo) interact with this API via standard REST, relying on the backend for all currency formatting, access control, and transaction integrity. The system successfully isolates Admin, Garage, and Customer scopes while orchestrating complex multi-step workflows like Diagnostics -> Quotes -> Bookings -> Payments -> Refunds securely.
