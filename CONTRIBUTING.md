# Contributing to Hello World Billing System

First off, thanks for taking the time to contribute!

## 📜 Code of Conduct

Help us keep the project clean, professional, and useful for everyone.

## 🛠️ Development Workflow

1.  **Understand the Architecture:**
    - The backend is built with **Node.js/Express**.
    - The database is **PostgreSQL**.
    - The frontend is **Vanilla JS/HTML/CSS** (SPA).
2.  **Local Setup:**
    - Clone the repo.
    - Run `npm install`.
    - Set `DATABASE_URL` (use `start_local.sh` if using Railway).
    - Start the server with `node server.js`.
3.  **Database Changes:**
    - `server.js` contains the `initDB()` function which handles schema initialization and migrations. Add your new table or column logic there within a transaction or appropriate `DO $$ ... $$` block.
4.  **Frontend Changes:**
    - All frontend logic is in `index.html`. For major changes, consider modularizing the JavaScript or CSS.
5.  **Testing:**
    - Run `node verify.js` to ensure the database operations are working as expected after your changes.
    - Manually test the UI flow (Create Bill -> Edit Bill -> Delete Bill).

## 📝 Pull Request Process

1.  Ensure your code follows the existing style (2-space indentation, consistent naming).
2.  Update the `README.md` if you've added new features or changed APIs.
3.  Provide a clear description of your changes in the PR.

## 🚀 Deployment

- The project is deployed on **Railway**.
- Use `railway up` to deploy your changes to a staging environment before merging to production.
