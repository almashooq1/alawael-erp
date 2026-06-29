const path = require('path');

function npmEslintRunner(scriptName, dir) {
  return (stagedFiles) => {
    const cwd = process.cwd();
    const targetDir = path.resolve(cwd, dir);
    const relativeFiles = stagedFiles
      .map((file) => path.relative(targetDir, path.resolve(cwd, file)).replace(/\\/g, '/'))
      .filter((file) => file && !file.startsWith('..'));

    if (relativeFiles.length === 0) {
      return [];
    }

    return `npm run ${scriptName} -- ${relativeFiles.map((f) => `"${f}"`).join(' ')}`;
  };
}

module.exports = {
  'backend/**/*.js': [npmEslintRunner('lint:staged:backend', 'backend'), 'prettier --write'],
  'frontend/src/**/*.{js,jsx}': [npmEslintRunner('lint:staged:frontend', 'frontend'), 'prettier --write'],
  'supply-chain-management/frontend/src/**/*.{js,jsx}': [npmEslintRunner('lint:staged:scm-frontend', 'supply-chain-management/frontend'), 'prettier --write'],
  'mobile/{src,App.tsx}/**/*.{ts,tsx}': [npmEslintRunner('lint:staged:mobile', 'mobile'), 'prettier --write'],
  '**/*.{json,md}': ['prettier --write'],
};
