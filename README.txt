INVENTORY & ORDER MANAGEMENT — MINIMUM SETUP

Requirements: PostgreSQL and Python. No Node.js/npm needed.

1. Extract this ZIP.
2. In pgAdmin create database: inventory_db
3. Open its Query Tool and run database/schema.sql
4. Open PowerShell in this folder:
   cd backend
   py -m pip install -r requirements.txt
   Copy-Item .env.example .env
5. Edit backend/.env and replace YOUR_PASSWORD with your PostgreSQL password.
6. Still in backend run:
   py seed.py
   py -m uvicorn app.main:app --reload
7. In a second PowerShell, open frontend:
   cd frontend
   py -m http.server 5500
8. Visit http://127.0.0.1:5500
API docs: http://127.0.0.1:8000/docs

The backend uses PostgreSQL. The order endpoint inserts the order, order items, and stock deductions in one transaction; failures roll back. Cancelling an order restores stock.
