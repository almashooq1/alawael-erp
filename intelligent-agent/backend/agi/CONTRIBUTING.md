# 📖 Contributing to Rehab AGI

شكراً لاهتمامك بالمساهمة في مشروع Rehab AGI! 🎉

**[English Guide Below]**

---

## 🇸🇦 الدليل بالعربية

### قبل البدء

1. تأكد من وجود Node.js 18+ و npm مثبتة
2. اقرأ [QUICK_START.md](QUICK_START.md) للبدء السريع

### خطوات المساهمة

#### 1. إنشاء فرع

```bash
git checkout -b feature/اسم-الميزة
```

#### 2. عمل التغييرات والاختبار

```bash
npm install && npm run build && npm test
```

#### 3. الالتزام بالتغييرات

```bash
git commit -m "feat: وصف الميزة الجديدة"
```

#### 4. إرسال Pull Request

```bash
git push origin feature/اسم-الميزة
```

---

## 🇬🇧 English Guide

First off, thank you for considering contributing to Rehab AGI System! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

---

## 🤝 Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to
uphold this code.

### Our Standards

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

---

## 💡 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When you create a bug
report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Environment details** (OS, Node version, etc.)
- **Code samples** if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an
enhancement suggestion, include:

- **Clear title and description**
- **Use case** - why this would be useful
- **Possible implementation** - if you have ideas

### Pull Requests

- Fill in the required template
- Follow the coding standards
- Include tests if applicable
- Update documentation
- End all files with a newline

---

## 🛠️ Development Setup

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
```

### Setup Steps

1. **Fork and clone the repository**

```bash
git clone https://github.com/yourusername/agi-system.git
cd agi-system/intelligent-agent/backend/agi
```

2. **Install dependencies**

```bash
npm install
```

3. **Create environment file**

```bash
cp .env.example .env
```

4. **Run tests**

```bash
npm test
```

5. **Start development server**

```bash
npm run dev
```

---

## 📝 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Properly type all functions and variables
- Avoid `any` type when possible

```typescript
// ✅ Good
async function processData(input: string, context: Context): Promise<Result> {
  // implementation
}

// ❌ Bad
async function processData(input: any, context: any): Promise<any> {
  // implementation
}
```

### File Structure

```typescript
// File header comment
// filename.ts
// Brief description of what this file does

import statements
↓
Type definitions
↓
Class/Function definitions
↓
Exports
```

### Naming Conventions

- **Classes**: PascalCase (`AGIReasoningEngine`)
- **Functions**: camelCase (`processInput`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_MEMORY_SIZE`)
- **Interfaces**: PascalCase with 'I' prefix optional (`Context` or `IContext`)
- **Files**: kebab-case (`reasoning.engine.ts`)

### Documentation

All public APIs must be documented:

```typescript
/**
 * Process input through AGI reasoning engine
 * @param input - The input string to process
 * @param context - Optional context object
 * @returns Promise resolving to reasoning result
 * @throws {Error} If input is invalid
 */
async function reason(input: string, context?: Context): Promise<Result> {
  // implementation
}
```

### Error Handling

Always handle errors gracefully:

```typescript
try {
  const result = await processInput(input);
  return result;
} catch (error: any) {
  this.emit('error', { input, error: error.message });
  throw error;
}
```

---

## 📦 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Build process or auxiliary tool changes

### Examples

```bash
feat(reasoning): add metacognitive reasoning capability

Implement metacognitive reasoning to enable self-reflection
on the reasoning process itself.

Closes #123

---

fix(learning): prevent memory consolidation race condition

Add mutex lock to prevent concurrent consolidation operations.

---

docs(readme): update installation instructions

Add prerequisites section and troubleshooting guide.
```

---

## 🔄 Pull Request Process

1. **Create a feature branch**

```bash
git checkout -b feat/your-feature-name
```

2. **Make your changes**

- Write code
- Add tests
- Update documentation

3. **Run tests**

```bash
npm test
npm run test:coverage
```

4. **Commit your changes**

```bash
git add .
git commit -m "feat(component): your commit message"
```

5. **Push to your fork**

```bash
git push origin feat/your-feature-name
```

6. **Create Pull Request**

- Go to the original repository
- Click "New Pull Request"
- Select your branch
- Fill in the PR template
- Submit!

### PR Checklist

Before submitting, ensure:

- [ ] Code follows the style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] No new warnings
- [ ] Dependent changes merged

---

## 🧪 Testing

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific file
npm test -- agi.test.ts
```

### Writing Tests

```typescript
describe('AGI Component', () => {
  let component: AGIComponent;

  beforeEach(() => {
    component = new AGIComponent();
  });

  test('should process input correctly', async () => {
    const result = await component.process('test input');
    expect(result).toBeDefined();
    expect(result.status).toBe('success');
  });
});
```

---

## 📚 Component Contribution Guidelines

### Adding a New Component

1. **Create component file**

```typescript
// new.component.ts
export class NewComponent extends EventEmitter {
  constructor() {
    super();
    // initialization
  }

  async process(input: any): Promise<any> {
    // implementation
  }
}
```

2. **Add to AGI Core**

```typescript
// agi.core.ts
import NewComponent from './new.component';

// In constructor:
this.newComponent = new NewComponent();
```

3. **Add API endpoint**

```typescript
// agi.routes.ts
router.post('/new-feature', async (req, res) => {
  // implementation
});
```

4. **Add tests**

```typescript
// new.component.test.ts
describe('NewComponent', () => {
  // tests
});
```

5. **Update documentation**

- Add to README.md
- Add to README_AGI.md
- Add examples to EXAMPLES.md

---

## 🎯 Areas for Contribution

### High Priority

- [ ] Implement placeholder methods in core components
- [ ] Add real ML model integration (TensorFlow.js)
- [ ] Build actual knowledge graph
- [ ] Add NLP capabilities
- [ ] Improve test coverage

### Medium Priority

- [ ] Performance optimization
- [ ] Better error messages
- [ ] More examples
- [ ] API documentation improvements
- [ ] Logging system

### Nice to Have

- [ ] Web UI for AGI system
- [ ] Visualization tools
- [ ] Monitoring dashboard
- [ ] Docker support
- [ ] CI/CD pipeline

---

## 🐛 Debugging

### Enable Debug Mode

```bash
DEBUG=agi:* npm run dev
```

### Common Issues

**Issue: Tests failing**

```bash
# Clear cache
npm run test -- --clearCache

# Update snapshots
npm run test -- --updateSnapshot
```

**Issue: TypeScript errors**

```bash
# Rebuild
npm run build

# Check types
npx tsc --noEmit
```

---

## 📖 Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Jest Testing](https://jestjs.io/docs/getting-started)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 🙏 Thank You!

Your contributions make this project better for everyone. Thank you for taking
the time to contribute! 🎉

---

## 📞 Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/agi-system/issues)
- **Discussions**:
  [GitHub Discussions](https://github.com/yourusername/agi-system/discussions)

---

**Happy Contributing! 🚀🧠**
