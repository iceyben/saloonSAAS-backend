# Salon Backend API — Reference

## Setup

```bash
npm install
cp .env.example .env       # fill in your values
npx prisma migrate dev --name init
npx prisma db seed
npm run dev                # starts on http://localhost:5000
```

---

## Authentication
All **admin-only** routes require:
```
Authorization: Bearer <token>
```
Get token from `POST /api/auth/login`.

---

## Endpoints

### 🔐 Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | ❌ | Admin login → returns JWT |
| GET | `/api/auth/me` | ✅ | Get logged-in admin info |
| PATCH | `/api/auth/password` | ✅ | Change admin password |

### 📅 Bookings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bookings/slots?date=&serviceId=` | ❌ | Available time slots for a date + service |
| POST | `/api/bookings` | ❌ | Customer creates booking (multipart/form-data) |
| GET | `/api/bookings?status=&date=` | ✅ | All bookings (filterable) |
| GET | `/api/bookings/:id` | ✅ | Single booking |
| PATCH | `/api/bookings/:id/approve` | ✅ | Approve → SMS sent |
| PATCH | `/api/bookings/:id/cancel` | ✅ | Cancel → SMS sent |
| PATCH | `/api/bookings/:id/reschedule` | ✅ | Reschedule → SMS sent |
| DELETE | `/api/bookings/:id` | ✅ | Hard delete |

**POST /api/bookings fields (multipart/form-data):**
```
customerName      string   required
customerPhone     string   required  (+250700000000 format)
customerEmail     string   optional
serviceId         number   required
appointmentDate   ISO8601  required
paymentMethod     MOMO | CASH   required
paymentScreenshot file     required if MOMO
notes             string   optional
```

### 💇 Services
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/services?category=` | ❌ | All active services |
| GET | `/api/services/:id` | ❌ | Single service |
| POST | `/api/services` | ✅ | Add service |
| PATCH | `/api/services/:id` | ✅ | Update service |
| DELETE | `/api/services/:id` | ✅ | Soft-deactivate |

### 🖼 Gallery
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/gallery?category=` | ❌ | Visible photos |
| POST | `/api/gallery` | ✅ | Upload photo (multipart: `photo` file + `category`) |
| PATCH | `/api/gallery/:id` | ✅ | Update caption/visibility |
| DELETE | `/api/gallery/:id` | ✅ | Delete from DB + Cloudinary |

### ⭐ Reviews
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reviews` | ❌ | Approved reviews only |
| GET | `/api/reviews/all` | ✅ | All reviews (admin) |
| POST | `/api/reviews` | ❌ | Customer submits review |
| PATCH | `/api/reviews/:id/approve` | ✅ | Approve review |
| PATCH | `/api/reviews/:id/reject` | ✅ | Reject review |
| DELETE | `/api/reviews/:id` | ✅ | Delete review |

### 📊 Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/analytics/overview` | ✅ | Revenue, popular services, peak hours |

### 📬 Contact
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/contact` | ❌ | Customer sends message |
| GET | `/api/contact` | ✅ | All messages (admin) |
| PATCH | `/api/contact/:id/read` | ✅ | Mark as read |

### 🕐 Business Hours
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/hours` | ❌ | All 7 days schedule |
| PATCH | `/api/hours/:id` | ✅ | Update a day |
| GET | `/api/hours/blocked` | ✅ | Blocked slots |
| POST | `/api/hours/blocked` | ✅ | Block a time range |
| DELETE | `/api/hours/blocked/:id` | ✅ | Remove blocked slot |

---

## Folder Structure
```
backend/
├── src/
│   ├── index.js              # Entry point, cron jobs
│   ├── lib/
│   │   ├── prisma.js         # Prisma singleton
│   │   └── cloudinary.js     # Cloudinary + Multer config
│   ├── middleware/
│   │   └── auth.js           # JWT middleware
│   ├── routes/
│   │   ├── auth.js
│   │   ├── bookings.js       # ← Most important
│   │   ├── services.js
│   │   ├── gallery.js
│   │   ├── reviews.js
│   │   ├── analytics.js
│   │   ├── contact.js
│   │   └── hours.js
│   └── services/
│       └── smsService.js     # Africa's Talking SMS
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── .env.example
└── package.json
```

## SMS Setup (Africa's Talking)
1. Sign up at [africastalking.com](https://africastalking.com)
2. Go to Sandbox → create app → copy API key
3. Set `AT_USERNAME=sandbox` and `AT_API_KEY=...` in `.env`
4. For production: create a live app, buy SMS credits (~$0.005/SMS in Rwanda)