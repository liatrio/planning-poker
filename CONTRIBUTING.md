# Contributing to Planning Poker

Thank you for your interest in contributing to Planning Poker! This guide will help you get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)

---

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/liatrio/planning-poker.git
   cd planning-poker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations**
   ```bash
   cd server
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start development servers**
   ```bash
   cd ..
   npm run dev
   ```

---

## Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and changelog generation.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature (triggers MINOR version bump)
- **fix**: A bug fix (triggers PATCH version bump)
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code changes that neither fix bugs nor add features
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates
- **ci**: CI/CD configuration changes
- **build**: Build system or external dependency changes

### Breaking Changes

Add `BREAKING CHANGE:` in the commit body or append `!` after the type/scope to trigger a MAJOR version bump.

```
feat!: remove support for Node 16

BREAKING CHANGE: Node 18+ is now required
```

### Examples

**Feature (MINOR version bump)**
```
feat(jira): add automatic ticket import

Implements Jira Cloud API integration to fetch ticket titles,
descriptions, and images when a Jira URL is provided during
story creation.

Closes #123
```

**Bug Fix (PATCH version bump)**
```
fix(voting): correct soft up/down modifier calculation

Previously, modifiers were not applied correctly to the
consensus value. Now adjusts votes to the mode value.
```

**Breaking Change (MAJOR version bump)**
```
feat(api)!: change WebSocket message format

BREAKING CHANGE: All WebSocket messages now require a storyId
field for multi-story support. Clients must be updated to
include storyId in VOTE, REVEAL_VOTES, and RESET_VOTES messages.
```

**Documentation**
```
docs: update README with Jira integration setup
```

**Chore**
```
chore(deps): update @tiptap/react to 3.15.3
```

### Scopes

Common scopes include:
- `client`: Frontend changes
- `server`: Backend changes
- `api`: API changes
- `db`: Database schema changes
- `jira`: Jira integration
- `ai`: AI provider integration
- `voting`: Voting system
- `ui`: User interface
- `docs`: Documentation
- `deps`: Dependencies
- `ci`: CI/CD

---

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes**
   - Write clear, descriptive commit messages using conventional commits
   - Keep commits focused and atomic
   - Add tests if applicable

3. **Test your changes**
   ```bash
   npm run build
   ```

4. **Push to your fork**
   ```bash
   git push origin feat/your-feature-name
   ```

5. **Open a Pull Request**
   - Fill out the PR template
   - Link related issues
   - Request review from code owners
   - Ensure all CI checks pass

6. **Address review feedback**
   - Make requested changes
   - Push new commits (do not force push during review)
   - Re-request review when ready

7. **Merge**
   - Once approved and CI passes, the PR will be merged
   - Semantic versioning will automatically determine the version bump
   - Docker images will be built and published

---

## Code Style

- **TypeScript**: Use TypeScript for all new code
- **Formatting**: Code is automatically formatted (follow existing patterns)
- **Naming**:
  - Use camelCase for variables and functions
  - Use PascalCase for classes and components
  - Use UPPER_CASE for constants
- **Comments**: Add comments for complex logic, not obvious code
- **Types**: Add explicit types for all function parameters and returns

---

## Testing

### Manual Testing

1. Start the development servers: `npm run dev`
2. Open http://localhost:5173
3. Test your changes in multiple scenarios:
   - Different browsers
   - Multiple users in the same session
   - Edge cases (disconnections, errors, etc.)

### Database Testing

```bash
cd server
npx prisma studio  # Opens database GUI
```

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR** version (1.0.0): Breaking changes
- **MINOR** version (0.1.0): New features (backward compatible)
- **PATCH** version (0.0.1): Bug fixes (backward compatible)

Versions are automatically determined from commit messages:
- `feat:` → MINOR bump
- `fix:` → PATCH bump
- `BREAKING CHANGE:` or `!` → MAJOR bump

---

## Docker Images

Docker images are automatically built and published to GitHub Container Registry on every merge to `main`:

- `ghcr.io/liatrio/planning-poker:latest` - Combined client + server
- `ghcr.io/liatrio/planning-poker-server:latest` - Server only
- `ghcr.io/liatrio/planning-poker-client:latest` - Client only

Images are tagged with:
- `latest` - Most recent main build
- `<version>` - Semantic version (e.g., `1.2.3`)
- `<major>.<minor>` - Major + minor version (e.g., `1.2`)
- `<major>` - Major version only (e.g., `1`)
- `main-<sha>` - Git commit SHA

---

## Questions?

If you have questions or need help, feel free to:
- Open an issue
- Ask in pull request comments
- Contact the maintainers

Thank you for contributing! 🎉
