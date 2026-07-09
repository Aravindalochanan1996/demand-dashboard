# Demand Dashboard — Login + Role-Based Dashboard

React frontend, Python (FastAPI) API, MongoDB backend.

## What's included

- **Login** (username/password → JWT), two roles: `business_user`, `admin`
- **Business user**: sidepane of assigned clients, table dashboard matching your
  screenshot's columns, can edit columns D onward (Profiles Submitted → Selected)
  only in Edit mode. Columns A–C (Date, Role, Required Positions) are locked.
- **Admin**: everything a business user has, plus:
  - Sees who last edited data (banner in navbar + `/api/admin/last-edited`)
  - Uploads an Excel workbook — each **sheet name becomes a client** in the
    sidepane, sheet rows become that client's table data
  - Can delete a row (soft delete)
  - Can view deleted rows per client

## Project layout

```
backend/    FastAPI app, MongoDB access, JWT auth
frontend/   React app (Create React App)
```

---

## 1. MongoDB setup (steps for you to do)

You have two easy options — pick one.

### Option A — MongoDB Atlas (free, hosted, recommended)

1. Go to https://www.mongodb.com/cloud/atlas and create a free account.
2. Create a free "M0" cluster.
3. Under **Database Access**, create a database user (username + password) —
   this is separate from your app's login users, it's just for connecting.
4. Under **Network Access**, add your IP (or `0.0.0.0/0` for testing only).
5. Click **Connect → Drivers**, copy the connection string, it looks like:
   `mongodb+srv://<db_user>:<db_password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`
6. Put that string into `backend/.env` as `MONGO_URI` (see step 2 below).

### Option B — Local MongoDB

1. Install MongoDB Community Edition (https://www.mongodb.com/try/download/community).
2. Start it: `mongod --dbpath /path/to/data`
3. Use `MONGO_URI=mongodb://localhost:27017` in `backend/.env`.

### Collections

You don't need to create collections manually — the app creates `users`,
`clients`, and `rows` automatically the first time it writes to them, and sets
up indexes on startup. Nothing to do here except pick A or B above.

---

## 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env: set MONGO_URI (from step 1) and a random JWT_SECRET

# Create your first admin user (asks for username/password interactively)
python seed_admin.py

# Run the API
uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000`. Interactive docs at
`http://localhost:8000/docs`.

### Creating business users

Log in as admin, then either:
- Use `POST /api/admin/users` (via the Swagger docs at `/docs`, or curl) with
  `{"username": "...", "password": "...", "role": "business_user", "assigned_clients": ["Client A"]}`
- `assigned_clients` controls which clients show up in that user's sidepane.
  Client names must match the sheet names you upload (see below).

---

## 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# edit .env if your API isn't on localhost:8000

npm start
```

Opens at `http://localhost:3000`.

---

## 4. Uploading your Excel data (as admin)

Your screenshot's columns map to these headers — use these exact header names
(case-insensitive) in row 1 of each sheet:

`Date | Role | Required Positions | Profiles Submitted | Drop out profile | Pending Interview | Interview Round 1 | Interview Round 2 | Selected`

- Each **sheet** = one client (sheet name becomes the client name shown in the
  sidepane).
- A trailing "Total" row is automatically skipped.
- Re-uploading a sheet **replaces** that client's active rows with the new
  sheet contents (soft-deleted rows are kept in the deleted-rows archive and
  are not affected).

In the app: log in as admin → **Upload Excel** button in the navbar → pick your
`.xlsx` file.

---

## 5. Assigning clients to a business user

After uploading, note the exact client (sheet) names, then create the business
user with those names in `assigned_clients` (via `/docs` → `POST /api/admin/users`).
You can also list existing clients with `GET /api/clients` while logged in as admin.

---

## Notes / things you may want to adjust

- Editable columns are enforced server-side too (`RowUpdateRequest` in
  `backend/app/schemas.py` only accepts columns D onward) — a user can't
  bypass the UI and edit Date/Role/Required Positions via the API.
- Deleting a row is a soft delete (`deleted: true` flag) — nothing is
  permanently destroyed, so **View Deleted Rows** always has the full history.
- `require_admin` / `get_current_user` in `backend/app/auth.py` are the two
  guards everything else is built on, if you want to add more roles later.
- For production: put `JWT_SECRET` behind a real secrets manager, restrict
  Atlas network access to your server's IP, and set `FRONTEND_ORIGIN` in
  `backend/.env` to your deployed frontend URL.
