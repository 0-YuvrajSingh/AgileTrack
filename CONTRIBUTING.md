# Contributing to AgileTrack

We appreciate your interest in contributing to AgileTrack! To keep the repository clean, structured, and easy to maintain, please follow these guidelines.

---

## Code of Conduct
By participating in this project, you agree to abide by our code of conduct, which promotes a respectful and welcoming environment for everyone.

---

## Development Workflow

### 1. Requirements
Ensure you have the following installed:
- **Java Development Kit (JDK) 21**
- **Node.js (v20+) & npm**
- **Docker & Docker Compose**

### 2. Fork and Clone
- Fork the repository on GitHub.
- Clone your fork locally:
  ```bash
  git clone https://github.com/your-username/AgileTrack.git
  ```

### 3. Local Branching
- Create a feature branch for your changes:
  ```bash
  git checkout -b feature/your-feature-name
  ```

### 4. Code Standards
- **Backend (Spring Boot)**: Follow standard Java coding conventions, use Lombok annotations appropriately, and keep controllers lightweight.
- **Frontend (React)**: Keep components reusable and typed correctly using TypeScript. Use Tailwind CSS for styling and custom CSS for specific designs.

---

## Commit Guidelines
- Write clear, concise, and descriptive commit messages.
- Example:
  ```text
  feat(backend): add workspace member validation constraints
  ```

---

## Testing Requirements
Before submitting a pull request, verify that all tests pass:

### Running Backend Tests
```bash
cd backend
./mvnw test
```

### Running Frontend Lints
```bash
cd frontend
npm run lint
```
All feature contributions must include appropriate unit or integration tests verifying the new behavior.
