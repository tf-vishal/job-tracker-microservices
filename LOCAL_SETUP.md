# 🏃‍♂️ Local Setup Guide

Follow these steps to run the Job Application Tracker microservices locally on your machine.

## Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed and running.
- [Docker Compose](https://docs.docker.com/compose/install/) (usually comes with Docker Desktop).

---

## 1. Environment Configuration

You need a `.env` file in the root of the project. We've provided a `.env.example` file that you can use.

```bash
# 1. Copy the example file to create your local .env
cp .env.example .env
```

### Generating Secure Keys
For local development, the default keys in `.env.example` are perfectly fine. However, if you want to practice generating real secure keys (like you would for production), here is how you do it:

**Generate a secure random string (using OpenSSL):**
```bash
# Run this in your terminal to generate a 64-character random string
openssl rand -hex 32
```

Run the command above 3 times and paste the results into your `.env` file for these variables:
1. `JWT_SECRET=your_first_random_string`
2. `JWT_REFRESH_SECRET=your_second_random_string`
3. `SERVICE_API_KEY=your_third_random_string`

Change `POSTGRES_PASSWORD` to any password you like (e.g., `POSTGRES_PASSWORD=my_secure_db_pass`).

---

## 2. Start the Application

Once your `.env` is ready, you can start the entire stack (4 databases + 5 Node.js services + 1 React frontend) with a single command:

```bash
docker compose up -d --build
```

- `-d` runs it in the background (detached mode).
- `--build` ensures it builds the Docker images from your latest code.

To see the logs of all services:
```bash
docker compose logs -f
```

---

## 3. Access the Application

Once everything is running, open your browser:

- **Frontend Application:** [http://localhost:3000](http://localhost:3000)
- **API Gateway (Backend):** [http://localhost:8080](http://localhost:8080)

You can verify the backend is healthy by visiting: [http://localhost:8080/health](http://localhost:8080/health)

---

## 4. Stopping the Application

When you are done working, you can stop the application:

```bash
# Stop the containers (preserves database data)
docker compose stop

# OR: Stop and remove the containers (preserves database data in Docker volumes)
docker compose down

# OR: Stop, remove containers, AND wipe the databases clean
docker compose down -v
```

---

## Moving to DevOps / Production?
When you are ready to learn K8s, Jenkins, and ArgoCD, check the `learning/README.md` guide. You will need to securely inject these environment variables using Kubernetes Secrets or AWS Secrets Manager instead of a `.env` file.
