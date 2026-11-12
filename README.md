# 🏦 Financial Transaction Management System (FTM)

A production-grade, full-stack financial transaction management application built with **Java 17**, **Spring Boot 3**, **MySQL**, and **Bootstrap 5**. Designed to simulate a real-world banking environment with strict financial integrity, role-based access control, and modern UI/UX.

## 📌 Project Overview
The FTM System provides a secure platform for managing customers, bank accounts, and financial transactions. It features strict concurrency handling, idempotency (to prevent double-charging), and a modern, responsive Fintech dashboard.

## 👥 Role-Based Access Control (RBAC)
The system enforces strict access control using **Spring Security**:
| Role | Permissions |
|---|---|
| **ADMIN** | Full access. Manage staff, customers, accounts, reverse transactions, view global reports, and audit logs. |
| **CASHIER** | Daily operations. Process deposits, withdrawals, search customers, and generate statements. Cannot manage staff or reverse transactions. |
| **CUSTOMER** | Self-service. Register, view own accounts, view balances, and download PDF/CSV statements. Cannot access other customers' data (IDOR protected). |

## 🛠️ Tech Stack
*   **Backend:** Java 17, Spring Boot 3.3.5, Spring Security 6, Spring Data JPA, Hibernate, Flyway Migrations.
*   **Database:** MySQL 8.x.
*   **Frontend:** HTML5, CSS3, Bootstrap 5, JavaScript, jQuery (AJAX), Chart.js.
*   **Security:** BCrypt, CSRF Protection, Role-Based Access Control, IDOR Protection.
*   **Utilities:** OpenPDF (PDF Generation), Swagger/OpenAPI (API Docs).

## 🔥 Key Features
*   **Financial Integrity:** Uses `BigDecimal` for monetary calculations to prevent precision loss.
*   **Concurrency Control:** Pessimistic Locking (`SELECT ... FOR UPDATE`) prevents double-spending during simultaneous withdrawals.
*   **Idempotency:** Unique Idempotency Keys on transaction endpoints prevent double-clicks and network retries from processing twice.
*   **Auditability:** Immutable audit logs track every login, creation, deposit, and reversal.
*   **Statement Generation:** Download bank statements instantly in **PDF** or **CSV** format.
*   **Interactive Dashboards:** Real-time statistics and Chart.js graphs for daily/monthly volume.
*   **Swagger Documentation:** Interactive API docs available at `/swagger-ui.html`.

## 📸 Screenshots
*(Add your screenshots here later)*
*   **Admin Dashboard:** [Insert screenshot of the Admin Dashboard with the Chart]
*   **Transaction Processing:** [Insert screenshot of the Deposit/Withdraw form]
*   **PDF Statement:** [Insert screenshot of the generated PDF]

## ⚙️ Architecture
The backend follows a clean **Layered Architecture**:
1.  **Controller:** Handles HTTP requests, validates DTOs, and returns REST responses.
2.  **Service:** Contains the core business logic (`@Transactional`), financial rules, and concurrency locks.
3.  **Repository:** Uses Spring Data JPA for database access.
4.  **Database:** Flyway manages schema versioning (V1, V2, V3 migrations).

## 🚀 Installation & Local Setup

### Prerequisites
*   Java 17
*   Maven
*   MySQL 8
*   Git

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/financial-transaction-management-system.git
cd financial-transaction-management-system