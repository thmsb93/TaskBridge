# 🚀 TaskBridge

## 💡 Overview

Welcome to **TaskBridge**! This project serves as a **lightweight starting point** for the rapid development of Proof-of-Concepts (POCs) and Minimum Viable Products (MVPs). It offers a ready-to-use structure for web applications that require file processing and real-time status display.

If you need to quickly validate an idea or build a prototype that involves file upload functionality and backend processing with live status updates, this could be your stepping stone.

![Usage](assets/example.gif)


## ✨ What it Offers

TaskBridge consists of two main components:

* **Frontend (Next.js):** An intuitive user interface that allows users to upload files. It also visualizes a dynamic table with all ongoing and completed jobs, including live updates on their progress and status.
* **Backend (FastAPI / Python):** A robust and fast API that handles file processing. It's designed to trigger jobs and provide their status to the frontend.

## 🚧 Important Note on Quality

Please keep in mind that this project is designed as a **template for rapid iterations**. This means:

* **The code is not perfect:** It was developed with a focus on speed and functionality for POCs and may not fully implement best practices regarding architecture, error handling, or scalability.
* **Errors may occur:** Minor bugs or inconsistencies are possible.
* **Design is functional:** The UI/UX design is kept simple and primarily serves to demonstrate the core functionality.

**It is explicitly intended for you to adapt and extend!** Think of it as a solid starting point that helps you skip the boilerplate code and focus directly on your core logic.

## 🚀 Quick Start

To get the project running locally, follow these steps:

### Prerequisites

* Node.js (LTS recommended)
* >= Python 3.10
* npm or yarn (for Frontend)

### Backend Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/thmsb93/TaskBridge
    cd taskbridge/backend
    ```
2.  Create and activate a virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # macOS/Linux
    # or `venv\Scripts\activate` on Windows
    ```
3.  Start the FastAPI server:
    ```bash
    uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
    ```
    The backend should now be accessible at `http://localhost:8000`.

### Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or yarn install
    ```
3.  Start the Next.js development server:
    ```bash
    npm run dev
    # or yarn dev
    ```
    The frontend should now be accessible at `http://localhost:3000`.

## 🛠️ Customization and Further Development

This template is a diamond in the rough, waiting to be polished! Here are some ideas on how you can customize and extend the project:

* **Backend:**
    * Implement your specific file processing logic.
    * Extend job status models with more detailed information.
    * Add authentication and authorization.
    * Integrate a database for job data persistence.
    * Improve error handling and logging.
* **Frontend:**
    * Adapt the UI/UX to your needs.
    * Extend the job list with filtering and sorting capabilities.
    * Implement detailed job views.
    * Add validations for file uploads.
    * Optimize real-time updates (e.g., using WebSockets).

## 🤝 Contributing

Since this project is intended as a template, pull requests with general improvements, bug fixes, or new example integrations are highly welcome! If you have ideas or suggestions, feel free to open an issue.