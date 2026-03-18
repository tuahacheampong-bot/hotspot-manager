# MikroTik Hotspot Manager

A production-ready web-based hotspot management system for MikroTik routers. Built with Next.js (App Router), TypeScript, Tailwind CSS, and MongoDB.

## Features

- **User Registration & Login** — Phone-based auth with JWT sessions
- **MikroTik Hotspot Integration** — Auto-create/disable hotspot users via RouterOS API
- **Plan Management** — 1-day, 7-day, and unlimited plans with time/data limits
- **Admin Panel** — Full user management, voucher generation, dashboard analytics
- **Manual Payment Verification** — Admin verifies payments and activates accounts manually
- **Voucher System** — Generate and redeem voucher codes
- **Usage Tracking** — Real-time session monitoring from MikroTik
- **Secure** — bcrypt passwords, JWT tokens, input validation, env-based secrets

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Backend | Next.js API Routes (serverless) |
| Database | MongoDB Atlas (Mongoose ODM) |
| Router | MikroTik RouterOS v7 (port 8728 API) |
| Auth | JWT (httpOnly cookies) |
| Deploy | Vercel |

## Prerequisites

- **Node.js** 18+ and npm
- **MongoDB Atlas** account (free tier works)
- **MikroTik L009** (or any RouterOS v7) with hotspot configured
- **Vercel** account (for deployment)

## Quick Start

### 1. Clone and Install

```bash
cd hotspot-manager
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hotspot-manager

# MikroTik Router
MIKROTIK_HOST=192.168.1.1
MIKROTIK_PORT=8728
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=your-mikrotik-password

# Auth
NEXTAUTH_SECRET=your-random-secret-key-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. MikroTik Configuration

Your MikroTik hotspot must be configured. Run these commands on your router:

```routeros
# Enable API service (port 8728)
/ip service enable api
/ip service set api disabled=no port=8728

# Create a dedicated API user (recommended over admin)
/user group add name=api-group policy=read,write,sensitive
/user add name=apiuser group=api-group password=StrongApiPassword123!

# Ensure hotspot is running
/ip hotspot set [find] disabled=no

# Create hotspot user profiles (if not already done)
/ip hotspot user/profile add name=1-day \
    address-pool=hotspot-pool \
    shared-user=local \
    idle-timeout=1d \
    keepalive-timeout=2m \
    status-autorefresh=1m \
    on-login="" \
    on-logout=""

/ip hotspot user/profile add name=7-day \
    address-pool=hotspot-pool \
    shared-user=local \
    idle-timeout=7d \
    keepalive-timeout=2m \
    status-autorefresh=1m

/ip hotspot user/profile add name=unlimited \
    address-pool=hotspot-pool \
    shared-user=local \
    idle-timeout=0s \
    keepalive-timeout=2m \
    status-autorefresh=1m

# Allow API access from Vercel (your server's IP)
# Or open API for your Vercel deployment IP range
/ip firewall filter add chain=input protocol=tcp dst-port=8728 \
    action=accept comment="Allow Hotspot Manager API"

# Ensure firewall allows API traffic
/ip firewall filter move [find comment="Allow Hotspot Manager API"] 0
```

**Important security notes:**
- Use a VPN/Tailscale for MikroTik API access (don't expose port 8728 publicly)
- Create a dedicated API user with minimal permissions
- Use the `routeros-client` package with SSL (port 8729) for production

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Create First Admin User

After registering a user via the UI, update the user's role to `admin` in MongoDB:

```javascript
// MongoDB shell or Compass
db.users.updateOne(
  { phone: "+233XXXXXXXXXX" },
  { $set: { role: "admin" } }
);
```

## Payment Verification

Payment verification is done manually by admin. When a user requests activation:

1. User selects a plan on their dashboard and clicks "Request Activation"
2. User makes payment via bank transfer or mobile money (details provided separately)
3. Admin verifies the payment manually
4. Admin activates the user's hotspot account through the admin panel

## Project Structure

```
hotspot-manager/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Login, register, logout
│   │   ├── hotspot/              # MikroTik user management
│   │   ├── plans/                # Plan listing
│   │   ├── users/                # Admin user management
│   │   ├── vouchers/             # Voucher generation & redemption
│   │   └── dashboard/            # Admin dashboard stats
│   ├── (auth)/                   # Auth pages (login, register)
│   ├── admin/                    # Admin panel
│   ├── dashboard/                # User dashboard
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/                   # Reusable UI components
├── lib/                          # Utility libraries
│   ├── auth.ts                   # JWT + bcrypt helpers
│   ├── mikrotik.ts               # MikroTik API client
│   ├── mongodb.ts                # MongoDB connection
│   ├── validation.ts             # Zod schemas + helpers
│   └── api-response.ts           # Standardized API responses
├── models/                       # Mongoose models
│   ├── User.ts                   # User schema
│   └── Voucher.ts                # Voucher schema
├── types/                        # TypeScript types
├── .env.example                  # Environment variable template
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/login` | Get current user from token |

### Hotspot
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/hotspot/create-user` | Create MikroTik hotspot user |
| POST | `/api/hotspot/disable-user` | Disable hotspot user |
| GET | `/api/hotspot/profiles` | List available profiles |
| GET | `/api/hotspot/usage` | Get user's usage stats |

### Admin (requires admin role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create a user directly |
| GET | `/api/users/:id` | Get single user |
| PATCH | `/api/users/:id` | Update user status |
| DELETE | `/api/users/:id` | Delete user |
| GET | `/api/dashboard` | Dashboard statistics |

### Vouchers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vouchers` | List all vouchers (admin) |
| POST | `/api/vouchers/generate` | Generate voucher codes (admin) |

### Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/plans` | List available plans |

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create hotspot-manager --public --source=. --push
```

### 2. Deploy to Vercel

```bash
vercel --prod
```

Or connect the GitHub repo in the Vercel dashboard.

### 3. Set Environment Variables

In Vercel dashboard → Project → Settings → Environment Variables:

- `MONGODB_URI`
- `MIKROTIK_HOST`
- `MIKROTIK_PORT`
- `MIKROTIK_USER`
- `MIKROTIK_PASSWORD`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_APP_URL` = `https://your-domain.vercel.app`

## MikroTik RouterOS v7 Commands Reference

```routeros
# View active hotspot users
/ip hotspot active print

# View all hotspot users
/ip hotspot user print

# View hotspot user profiles
/ip hotspot user/profile print

# Remove a hotspot user
/ip hotspot user remove [find name=user_xxx]

# Enable/disable a hotspot user
/ip hotspot user enable [find name=user_xxx]
/ip hotspot user disable [find name=user_xxx]

# Check API service status
/ip service print where name=api

# Check firewall rules
/ip firewall filter print
```

## Security Checklist

- [x] Passwords hashed with bcrypt (salt rounds: 12)
- [x] JWT tokens in httpOnly cookies
- [x] Input validation with Zod
- [x] MikroTik credentials in environment variables
- [x] Admin routes require role check
- [x] API responses standardized (no info leakage)
- [ ] Use VPN/Tailscale for MikroTik API access (recommended)
- [ ] Enable SSL (port 8729) for MikroTik API in production
- [ ] Set up rate limiting on API routes
- [ ] Add CAPTCHA for registration (optional)

## License

MIT
