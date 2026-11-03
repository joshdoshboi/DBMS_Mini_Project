# Stockroom — Inventory & Order Management System

A database-driven inventory and order management system built using **PostgreSQL, FastAPI, Python, HTML, CSS, and JavaScript**.

Stockroom simplifies inventory operations by bringing product management, supplier records, customer information, and order processing into one system.

## Overview

Managing inventory manually can lead to inaccurate stock records, inefficient order processing, and difficulty tracking products.

Stockroom addresses these challenges through a centralized application backed by a relational database. It demonstrates how database concepts can be applied to a practical business use case.

## Features

- **Dashboard:** Overview of inventory and order-related information.
- **Product Management:** Create, view, update, and delete product records.
- **Category Management:** Organize products into categories.
- **Supplier Management:** Maintain supplier information.
- **Customer Management:** Store and manage customer records.
- **Order Management:** Create and manage customer orders.
- **Stock Tracking:** Update product stock when orders are processed.
- **Database Relationships:** Maintain data consistency using relational constraints.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| API | REST API |
| Database Access | SQLAlchemy |

## Database Design

The project uses a relational database consisting of six main tables:

| Table | Purpose |
|---|---|
| `categories` | Stores product categories |
| `suppliers` | Stores supplier details |
| `products` | Stores product information and stock |
| `customers` | Stores customer details |
| `orders` | Stores customer order records |
| `order_items` | Stores individual products within each order |

### Key Database Concepts

- Primary Keys and Foreign Keys
- Referential Integrity
- One-to-Many Relationships
- CRUD Operations
- SQL Joins
- Aggregate Functions and Grouping
- Database Normalization
- Transactions and ACID Properties
- Constraints and Indexing

## Project Structure

```text
Stockroom/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py
│   ├── requirements.txt
│   └── seed.py
│
├── database/
│   └── schema.sql
│
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

Make sure you have installed:

- Python 3.10 or later
- PostgreSQL
- Git
- A modern web browser

### 1. Clone the Repository

```bash
git clone https://github.com/joshdoshboi/DBMS_Mini_Project.git
cd DBMS_Mini_Project
```

### 2. Set Up the Database

1. Open PostgreSQL using pgAdmin.
2. Create a database named `inventory_db`.
3. Open the Query Tool.
4. Execute the SQL script located at `database/schema.sql`.

### 3. Configure the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` directory and configure your database connection:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/inventory_db
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

### 4. Initialize Sample Data

If you want to populate the database with sample records, run:

```bash
python seed.py
```

### 5. Start the Backend

From the `backend` directory:

```bash
python -m uvicorn app.main:app --reload
```

Backend API:

`http://127.0.0.1:8000`

Interactive API documentation:

`http://127.0.0.1:8000/docs`

### 6. Launch the Frontend

Open a second terminal, navigate to the frontend directory, and run:

```bash
python -m http.server 5500
```

Open the application:

`http://127.0.0.1:5500`

## Application Architecture

```text
          User
            |
            v
     Frontend Interface
      HTML / CSS / JS
            |
            v
        FastAPI
        Backend
            |
            v
      PostgreSQL
       Database
```

The frontend communicates with the FastAPI backend through HTTP requests. The backend handles application logic and interacts with PostgreSQL to retrieve and modify data.

## Project Objective

The primary objective of Stockroom is to demonstrate the practical implementation of relational database management concepts through a functional inventory and order management application.

It combines database design, backend development, API integration, and frontend development into one project.

## Future Enhancements

- User authentication and role-based access control
- Advanced inventory analytics
- Low-stock notifications
- Sales and inventory reports
- Exportable reports
- Improved order tracking


---

*Stockroom — Simplifying Inventory, Streamlining Orders.*
