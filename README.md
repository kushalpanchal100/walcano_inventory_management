# Walcano Inventory Management

AI-powered inventory management system for **Wallcano Tiles** & **Surfaces Tiles**, built with a FastAPI backend and Next.js frontend. Integrates directly with **QuickBooks Online** for live inventory data and leverages **Google Gemini AI** for intelligent product mapping, natural language search, and proactive restock insights.

---

## Features

### 🔗 QuickBooks Online Integration
- OAuth 2.0 authentication flow with automatic token refresh
- Real-time inventory sync from QuickBooks Online sandbox/production
- Unified product catalog across Wallcano and Surfaces Tiles brands

### 🤖 AI-Powered Intelligence (Gemini)
- **Copilot Chat** — Conversational assistant that answers inventory questions, suggests filters, and provides actionable insights
- **Restock Insights** — Proactive restock reports with stockout risk tiers, health scores, and urgency rankings
- **Semantic Search** — Natural language product search across the entire tile catalog

### 📊 Dashboard & UI
- Modern Next.js dashboard with responsive layout
- Live inventory table with search, filters, and CSV export
- AI Copilot side drawer for real-time chat
- Manual product mapping modal
- Restock insights modal with risk tier visualizations

---

## Tech Stack

| Layer       | Technology                          |
| ----------- | ----------------------------------- |
| **Frontend** | Next.js 16, React 19, TypeScript   |
| **Backend**  | FastAPI, Python 3.10+, Uvicorn     |
| **AI**       | Google Gemini (via `google-genai`)  |
| **Accounting** | QuickBooks Online API (OAuth 2.0) |
| **Styling**  | Vanilla CSS with custom design system |
| **Icons**    | Lucide React                        |

---

## Project Structure

```
walcano_inventory_management/
├── backend/
│   ├── app/
│   │   ├── main.py                      # FastAPI app entrypoint
│   │   ├── api/
│   │   │   ├── ai/routes.py            # AI Copilot, restock, semantic search
│   │   │   └── quickbooks/routes.py    # OAuth flow, inventory, CSV export
│   │   ├── config/settings.py          # Pydantic settings (env-based)
│   │   ├── integrations/
│   │   │   └── quickbooks/
│   │   │       ├── client.py           # QBO HTTP client (httpx)
│   │   │       └── product_mapping.py  # Custom mapping persistence
│   │   └── services/
│   │       └── ai/
│   │           ├── copilot_service.py
│   │           ├── gemini_provider.py
│   │           ├── restock_insights_service.py
│   │           └── semantic_search_service.py
│   ├── scripts/
│   │   └── seed_qbo_tiles.py           # Seed script for QBO sandbox data
│   ├── requirements.txt
│   ├── pytest.ini
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx            # Dashboard redirect
│   │   │   │   └── inventory/page.tsx  # Inventory management page
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                # Landing / redirect
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx     # Sidebar + top nav layout
│   │   │   ├── AiCopilotDrawer.tsx     # AI chat side panel
│   │   │   ├── AiRestockModal.tsx      # Restock insights modal
│   │   │   └── ManualMapModal.tsx      # Manual product mapping modal
│   │   └── lib/
│   │       ├── api.ts                  # Backend API client
│   │       └── csvExport.ts            # CSV export utility
│   └── package.json
├── .gitignore
├── run.sh                              # Unified start script
└── README.md
```

---

## Getting Started

### Prerequisites

- **Python 3.10+** (Conda environment recommended)
- **Node.js 18+** and npm
- **QuickBooks Online developer account** ([developer.intuit.com](https://developer.intuit.com))
- **Google Gemini API key** ([aistudio.google.com](https://aistudio.google.com))

### 1. Clone the repository

```bash
git clone https://github.com/<your-org>/walcano_inventory_management.git
cd walcano_inventory_management
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment (or use conda)
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials:
#   GEMINI_API_KEY, QBO_CLIENT_ID, QBO_CLIENT_SECRET, etc.
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

### 4. Run the application

Use the unified start script from the project root:

```bash
# Start backend only (default) — http://localhost:8000
./run.sh

# Start frontend only — http://localhost:3000
./run.sh frontend

# Start both together
./run.sh both
```

---

## Environment Variables

Create `backend/.env` from the provided example:

| Variable              | Description                              | Required |
| --------------------- | ---------------------------------------- | -------- |
| `GEMINI_API_KEY`      | Google Gemini API key                    | Yes      |
| `GEMINI_MODEL`        | Gemini model name (default: `gemini-3.6-flash`) | No |
| `QBO_CLIENT_ID`       | QuickBooks OAuth client ID               | Yes      |
| `QBO_CLIENT_SECRET`   | QuickBooks OAuth client secret           | Yes      |
| `QBO_REDIRECT_URI`    | OAuth callback URL                       | Yes      |
| `QBO_ENVIRONMENT`     | `sandbox` or `production`                | No       |
| `APP_ENV`             | `development` or `production`            | No       |
| `DEBUG`               | Enable debug mode (`true`/`false`)       | No       |
| `CORS_ORIGINS`        | Comma-separated allowed origins          | No       |

---

## API Endpoints

Base URL: `http://localhost:8000`

### Health & Root

| Method | Endpoint       | Description             |
| ------ | -------------- | ----------------------- |
| GET    | `/`            | Root welcome message    |
| GET    | `/api/health`  | Health check            |
| GET    | `/api/docs`    | Swagger UI (debug mode) |

### QuickBooks (`/api/v1/quickbooks`)

| Method | Endpoint          | Description                     |
| ------ | ----------------- | ------------------------------- |
| GET    | `/auth`           | Initiate OAuth flow             |
| GET    | `/callback`       | OAuth callback handler          |
| GET    | `/status`         | Connection status               |

### Inventory (`/api/v1/inventory`)

| Method | Endpoint          | Description                     |
| ------ | ----------------- | ------------------------------- |
| GET    | `/items`          | List inventory items with filters |

### AI (`/api/v1/ai`)

| Method | Endpoint              | Description                              |
| ------ | --------------------- | ---------------------------------------- |
| GET    | `/status`             | AI provider configuration status         |
| POST   | `/chat`               | Chat with the AI Inventory Copilot       |
| POST   | `/accept-mapping`     | Persist an accepted mapping              |
| GET    | `/custom-mappings`    | List all confirmed mappings              |
| DELETE | `/custom-mappings/:name` | Remove a custom mapping               |
| POST   | `/restock-insights`   | Generate restock report & risk tiers     |
| POST   | `/semantic-search`    | Natural language product search          |

---

## QuickBooks Sandbox Setup

1. Create an app at [developer.intuit.com](https://developer.intuit.com)
2. Set the redirect URI to `http://localhost:8000/api/v1/quickbooks/callback`
3. Copy your **Client ID** and **Client Secret** into `backend/.env`
4. Optionally seed sandbox data:
   ```bash
   cd backend
   python scripts/seed_qbo_tiles.py
   ```
5. Start the backend and navigate to `http://localhost:8000/api/v1/quickbooks/auth` to initiate the OAuth flow

---

## Development

```bash
# Run backend with hot-reload
cd backend && uvicorn app.main:application --reload --port 8000

# Run frontend dev server
cd frontend && npm run dev

# Run tests
pytest
```

---

## License

Private — All rights reserved.