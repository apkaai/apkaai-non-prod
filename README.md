# ApkaAI — World's #1 AI Tools Marketplace

> Discover, compare and access 43 of the best AI tools — ChatGPT, Claude, Midjourney, Cursor and more — all in one place.

**🌐 Live:** [apkaai.com](https://apkaai.com) &nbsp;|&nbsp; **Stack:** Next.js 14 · Node.js · PostgreSQL · AWS EC2 · S3 · CloudFront

---

## ✨ Features

- 🔍 **43 curated AI tools** across 15 categories — hand-picked and verified
- ⚖️ **Side-by-side comparison** — compare up to 4 tools on pricing, features & ratings
- 💰 **Pricing in INR (₹)** — all plans shown for easy comparison
- 🌙 **Dark / Light mode** — persisted with `localStorage`, respects system preference
- 🤖 **AI Chatbot** — floating assistant with ApkaAI knowledge base
- 📱 **Social widget** — WhatsApp channel, LinkedIn, Twitter, and more
- 🔐 **Auth** — Sign In / Sign Up with JWT
- ⚡ **Fast** — Static pages pre-rendered, served via Nginx on EC2

---

## 📁 Project Structure

```
apkaai/
├── frontend/                      # Next.js 14 (App Router)
│   ├── app/
│   │   ├── page.tsx               # Homepage — landing page
│   │   ├── tools/page.tsx         # All tools catalog (search + filter)
│   │   ├── tools/[slug]/page.tsx  # Individual tool detail page
│   │   ├── category/[slug]/page.tsx
│   │   ├── compare/page.tsx       # Side-by-side comparison tool
│   │   ├── pricing/page.tsx       # Pricing guide
│   │   ├── signin / signup /
│   │   │   forgot-password/
│   │   ├── about / blog / careers /
│   │   │   contact / help / privacy /
│   │   │   terms / cookies/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── Navbar.tsx             # Fixed navbar with theme toggle
│   │   ├── Footer.tsx
│   │   ├── ThemeToggle.tsx        # Dark/light mode toggle
│   │   ├── ToolCard.tsx
│   │   ├── CategoryCard.tsx
│   │   ├── AIChatbot.tsx          # Floating AI assistant
│   │   ├── FloatingSocialWidget.tsx # Fixed social icons widget
│   │   └── landing/               # Landing page section components
│   │       ├── HeroSection.tsx
│   │       ├── StatsBar.tsx
│   │       ├── FeaturedToolsSection.tsx
│   │       ├── CategoriesSection.tsx
│   │       ├── HowItWorksSection.tsx
│   │       ├── FeaturesSection.tsx
│   │       ├── CompareCTASection.tsx
│   │       ├── TestimonialsSection.tsx
│   │       ├── FinalCTASection.tsx
│   │       └── index.ts
│   └── lib/
│       └── tools-data.ts          # 43 tools + 15 categories static data
│
├── backend/                       # Node.js + Express API
│   ├── src/
│   │   ├── index.js               # Express server (port 4000)
│   │   ├── routes/                # tools, categories, contact, auth
│   │   ├── controllers/
│   │   └── lib/
│   │       ├── db.js              # PostgreSQL client (pg)
│   │       ├── migrate.js         # DB migrations
│   │       └── schema.sql         # Database schema
│   └── .env.example
│
├── deploy/                        # AWS deployment scripts
│   ├── 01-setup-ec2.sh            # Bootstrap EC2 (Node, Nginx, PM2)
│   ├── 02-nginx.sh                # Reverse proxy config
│   ├── 03-ssl.sh                  # Let's Encrypt SSL
│   ├── 04-s3-cloudfront.sh        # S3 + CloudFront CDN
│   ├── 05-godaddy-dns-guide.md    # DNS setup guide
│   ├── deploy.sh                  # Re-deploy from Git (EC2 IP: 3.6.107.51)
│   └── iam-policy.json            # Least-privilege IAM policy
│
└── .kiro/settings/mcp.json        # MCP server config for Kiro IDE
```

---

## 🛠️ Tech Stack

| Layer     | Technology                  | Hosting / Service     |
|-----------|-----------------------------|-----------------------|
| Frontend  | Next.js 14 + Tailwind CSS   | AWS EC2 (ap-south-1)  |
| Backend   | Node.js 20 + Express        | AWS EC2 (ap-south-1)  |
| Database  | PostgreSQL 16.9             | AWS RDS               |
| Static    | S3 + CloudFront CDN         | AWS S3 + CF           |
| SSL       | Let's Encrypt (certbot)     | Nginx                 |
| Process   | PM2                         | EC2                   |
| DNS       | GoDaddy → Route 53          | AWS Route 53          |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL running locally (or connection string to RDS)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your DB connection string
npm install
node src/lib/migrate.js    # Run DB migrations (run once)
npm run dev                # Start API on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                # Start on http://localhost:3000
```

### 3. Test the API

```bash
# Health check
curl http://localhost:4000/health

# List all tools
curl http://localhost:4000/api/tools

# Get a specific tool
curl http://localhost:4000/api/tools/chatgpt

# Filter by category
curl "http://localhost:4000/api/tools?category=coding"

# Search
curl "http://localhost:4000/api/tools?search=image"

# List categories
curl http://localhost:4000/api/categories
```

---

## 📡 API Reference

### Tools

| Method | Endpoint                  | Description                                          |
|--------|---------------------------|------------------------------------------------------|
| GET    | `/api/tools`              | List tools (filter: `category`, `pricing`, `search`, `sort`) |
| GET    | `/api/tools/featured`     | Featured tools only                                  |
| GET    | `/api/tools/:slug`        | Single tool by slug                                  |
| GET    | `/api/categories`         | All 15 categories                                    |
| GET    | `/api/categories/:slug`   | Single category + its tools                          |
| POST   | `/api/contact`            | Submit contact form                                  |
| POST   | `/api/auth/signup`        | Register new user                                    |
| POST   | `/api/auth/signin`        | Sign in, returns JWT                                 |

### Query Parameters for `/api/tools`

| Param      | Example             | Description                        |
|------------|---------------------|------------------------------------|
| `category` | `coding`            | Filter by category slug            |
| `pricing`  | `Freemium`          | `Free` / `Freemium` / `Paid`       |
| `search`   | `image generation`  | Full-text search                   |
| `sort`     | `rating`            | `popular` / `rating` / `new` / `name` |

---

## ☁️ Deployment (AWS EC2)

```bash
# 1. Launch EC2 t3.micro (Amazon Linux 2023, ap-south-1)
#    Elastic IP: 3.6.107.51
#    Open ports: 22, 80, 443

# 2. SSH in
ssh -i apkaai-key.pem ec2-user@3.6.107.51

# 3. Bootstrap server
bash 01-setup-ec2.sh      # Node, Nginx, PM2, clone repo

# 4. Configure web server
bash 02-nginx.sh          # Nginx reverse proxy
bash 03-ssl.sh            # SSL certificate (after DNS is live)

# 5. CDN (from local)
bash 04-s3-cloudfront.sh  # S3 + CloudFront

# 6. Run migrations
cd backend && node src/lib/migrate.js
```

See `deploy/05-godaddy-dns-guide.md` for DNS setup with GoDaddy / Route 53.

---

## 🔁 Re-Deploy After Code Changes

```bash
# From EC2:
cd /home/ec2-user/apkaai
git pull origin main
cd frontend && rm -rf .next && npm run build
pm2 restart apkaai-frontend
pm2 restart apkaai-api
```

Or run `bash deploy/deploy.sh` from your local machine (requires SSH key).

---

## 🤖 AI Categories (15)

| Emoji | Category                  | Example Tools                        |
|-------|---------------------------|--------------------------------------|
| 💬    | AI Chat & Research        | ChatGPT, Claude, Gemini, Perplexity  |
| 💻    | Coding                    | Cursor, GitHub Copilot, Windsurf     |
| 🎨    | Image Generation          | Midjourney, Adobe Firefly, Ideogram  |
| 🎬    | Video Generation          | Runway, HeyGen, Pika                 |
| 🎵    | Music & Audio             | Suno, ElevenLabs, Udio               |
| ✍️    | Writing & Content         | Jasper, Grammarly, Copy.ai           |
| 📊    | Presentations             | Gamma, Canva, Beautiful.ai           |
| 📚    | Research & Productivity   | NotebookLM, Notion AI, Elicit        |
| 🖼️   | Design                    | Figma AI, Adobe Firefly, Canva       |
| 🗣️   | Voice & Avatars           | ElevenLabs, HeyGen, PlayHT           |
| 🤖    | Automation                | Zapier AI, Make, n8n                 |
| 📈    | Business & Marketing      | HubSpot AI, Jasper, Salesforce AI    |
| 📝    | Meetings & Transcription  | Otter.ai, Fireflies, Fathom          |
| 🧠    | Learning                  | Khanmigo, NotebookLM, Quizlet AI     |
| 🔍    | AI Search                 | Perplexity, You.com, ChatGPT Search  |

---

## 🔑 Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```env
PORT=4000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/apkaai
FRONTEND_URL=https://apkaai.com
JWT_SECRET=your_jwt_secret_here
```

---

## 📬 Contact

**Ashutosh Kumar Pandey** — Founder & CEO  
📧 [ashutoshkumarpandey@apkaai.com](mailto:ashutoshkumarpandey@apkaai.com)  
🔗 [LinkedIn](https://www.linkedin.com/company/apkaai/) &nbsp;|&nbsp; [Twitter/X](https://x.com/apkaAI2026)  
📍 Ace City, Greater Noida, Uttar Pradesh, India

---

Built with ❤️ for the World 🌍 | [apkaai.com](https://apkaai.com)
