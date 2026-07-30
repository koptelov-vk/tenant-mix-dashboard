#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { loadTokenFiles, renderTokens } from './generate-design-tokens.mjs';

const SOURCE_EXTENSIONS = new Set(['.css', '.js', '.jsx', '.ts', '.tsx']);
const PRINT_KEYS = [
  'print-surface',
  'print-surface-subtle',
  'print-text',
  'print-text-muted',
  'print-accent',
  'print-border',
  'print-positive',
  'print-negative',
  'print-warning',
];

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const normalizedPath = (path) => path.replaceAll('\\', '/');
const withoutComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

function collectFiles(directory) {
  const files = [];
  const walk = (path) => {
    for (const entry of readdirSync(path)) {
      const candidate = resolve(path, entry);
      if (statSync(candidate).isDirectory()) walk(candidate);
      else if (SOURCE_EXTENSIONS.has(extname(candidate))) files.push(candidate);
    }
  };
  walk(directory);
  return files.sort();
}

function luminance(hex) {
  const channels = [1, 3, 5]
    .map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function cliArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

export function validate({
  rootDirectory = '.',
  tokenDirectory = 'design-system/tokens',
  sourceDirectory = 'src',
  outputPath = 'src/styles/tokens.css',
  allowlistPath = 'design-system/tokens/hardcoded-color-allowlist.json',
  contrastContractPath = 'design-system/tokens/contrast-contract.json',
  provenancePath = 'design-system/tokens/provenance.json',
} = {}) {
  const root = resolve(rootDirectory);
  const tokenFiles = loadTokenFiles(resolve(root, tokenDirectory));
  const contrastContract = readJson(resolve(root, contrastContractPath));
  const allowlist = readJson(resolve(root, allowlistPath));
  const provenance = readJson(resolve(root, provenancePath));
  const sourceRoot = resolve(root, sourceDirectory);
  const sourceFiles = collectFiles(sourceRoot);
  const errors = [];
  const fail = (check, message) => errors.push(`${check}: ${message}`);

  for (const [name, expectedHash] of Object.entries(provenance.canonicalTextSha256)) {
    const canonicalText = readFileSync(resolve(root, tokenDirectory, name), 'utf8')
      .replaceAll('\r\n', '\n')
      .trimEnd();
    const actualHash = createHash('sha256').update(canonicalText).digest('hex');
    if (actualHash !== expectedHash) {
      fail('provenance', `${name} differs from accepted archive ${provenance.sourceArchiveSha256}`);
    }
  }

  const requiredKeys = [...tokenFiles.schema.requiredKeys].sort();
  for (const [theme, tokens] of [['dark', tokenFiles.dark], ['light', tokenFiles.light]]) {
    const keys = Object.keys(tokens).sort();
    if (JSON.stringify(keys) !== JSON.stringify(requiredKeys)) {
      fail('schema', `${theme}.tokens.json must contain exactly ${requiredKeys.length} required keys`);
    }
  }
  if (JSON.stringify(Object.keys(tokenFiles.dark).sort()) !== JSON.stringify(Object.keys(tokenFiles.light).sort())) {
    fail('parity', 'dark and light key sets differ');
  }
  if (JSON.stringify(Object.keys(tokenFiles.print).sort()) !== JSON.stringify([...PRINT_KEYS].sort())) {
    fail('print', 'print.tokens.json must contain the exact nine-key print namespace');
  }

  for (const [namespace, tokens] of [
    ['dark', tokenFiles.dark],
    ['light', tokenFiles.light],
    ['print', tokenFiles.print],
  ]) {
    for (const [name, value] of Object.entries(tokens)) {
      if (!/^#[0-9a-f]{6}$/i.test(value)) {
        fail('literal', `${namespace}.${name} must be a six-digit hex literal`);
      }
    }
  }

  const expectedCss = renderTokens(tokenFiles);
  const actualCss = readFileSync(resolve(root, outputPath), 'utf8');
  if (actualCss !== expectedCss) {
    fail('generated-css', `${outputPath} is not byte-identical to canonical JSON output`);
  }

  const customPropertyDefinitions = new Set(requiredKeys.concat(PRINT_KEYS));
  for (const file of sourceFiles) {
    const text = withoutComments(readFileSync(file, 'utf8'));
    for (const match of text.matchAll(/--([a-z0-9_-]+)\s*:/gi)) {
      customPropertyDefinitions.add(match[1]);
      if (requiredKeys.includes(match[1]) && resolve(file) !== resolve(root, outputPath)) {
        fail('parallel-token-source', `${normalizedPath(relative(root, file))} redeclares canonical --${match[1]}`);
      }
    }
  }

  let variableReferenceCount = 0;
  for (const file of sourceFiles) {
    const text = withoutComments(readFileSync(file, 'utf8'));
    for (const match of text.matchAll(/var\(--([a-z0-9_-]+)/gi)) {
      variableReferenceCount += 1;
      if (!customPropertyDefinitions.has(match[1])) {
        fail('undefined-var', `${normalizedPath(relative(root, file))} references undefined var(--${match[1]})`);
      }
    }
  }

  const actualHardcoded = {};
  for (const file of sourceFiles) {
    if (resolve(file) === resolve(root, outputPath)) continue;
    const path = normalizedPath(relative(root, file));
    const hexPattern = extname(file) === '.css'
      ? /#[0-9a-f]{8}\b|#[0-9a-f]{6}\b|#[0-9a-f]{4}\b|#[0-9a-f]{3}\b/gi
      : /#[0-9a-f]{8}\b|#[0-9a-f]{6}\b/gi;
    const colors = [...withoutComments(readFileSync(file, 'utf8')).matchAll(hexPattern)]
      .map((match) => match[0].toLowerCase());
    const unique = [...new Set(colors)].sort();
    if (unique.length) actualHardcoded[path] = unique;
  }

  for (const [path, colors] of Object.entries(actualHardcoded)) {
    const allowed = new Set(allowlist.files[path] ?? []);
    for (const color of colors) {
      if (!allowed.has(color)) fail('hardcoded-color', `${path} contains unauthorized ${color}`);
    }
  }
  for (const [path, colors] of Object.entries(allowlist.files)) {
    const actual = new Set(actualHardcoded[path] ?? []);
    for (const color of colors) {
      if (!actual.has(color)) fail('stale-allowlist', `${path} no longer contains ${color}`);
    }
  }

  const surfaces = contrastContract.surfaces;
  const decorative = new Set(contrastContract.decorativeTokens);
  let validatedRows = 0;
  let excludedRows = 0;
  for (const [theme, tokens] of [['dark', tokenFiles.dark], ['light', tokenFiles.light]]) {
    for (const [name, value] of Object.entries(tokens)) {
      if (surfaces.includes(name) || name === 'text-inverse' || decorative.has(name)) continue;
      const threshold = name.startsWith('text-') || name.endsWith('-text') ? 4.5 : 3;
      for (const surface of surfaces) {
        const forbidden = contrastContract.forbidden[theme]?.[name]?.includes(surface) ?? false;
        if (forbidden) {
          excludedRows += 1;
          continue;
        }
        validatedRows += 1;
        const ratio = contrastRatio(value, tokens[surface]);
        if (ratio < threshold) {
          fail('contrast', `${theme}.${name} on ${surface} is ${ratio.toFixed(2)}:1; requires ${threshold}:1`);
        }
      }
    }
  }

  const decorativeRows = decorative.size * surfaces.length * 2;
  if (validatedRows !== contrastContract.validatedRows) {
    fail('contrast-count', `validated ${validatedRows}; expected ${contrastContract.validatedRows}`);
  }
  if (excludedRows !== contrastContract.excludedRows) {
    fail('contrast-count', `excluded ${excludedRows}; expected ${contrastContract.excludedRows}`);
  }
  if (decorativeRows !== contrastContract.decorativeExemptRows) {
    fail('contrast-count', `decorative-exempt ${decorativeRows}; expected ${contrastContract.decorativeExemptRows}`);
  }
  const reconciledRows = validatedRows + excludedRows + decorativeRows + contrastContract.informationalRows;
  if (reconciledRows !== contrastContract.totalRows) {
    fail('contrast-count', `reconciled ${reconciledRows}; expected ${contrastContract.totalRows}`);
  }

  const cssFiles = sourceFiles.filter((path) => extname(path) === '.css');
  for (const file of cssFiles) {
    const text = withoutComments(readFileSync(file, 'utf8'));
    for (const block of text.matchAll(/\{([^{}]*)\}/g)) {
      for (const [theme, themeRules] of Object.entries(contrastContract.forbidden)) {
        for (const [token, forbiddenSurfaces] of Object.entries(themeRules)) {
          for (const surface of forbiddenSurfaces) {
            if (block[1].includes(`var(--${token})`) && block[1].includes(`var(--${surface})`)) {
              fail('forbidden-combination', `${normalizedPath(relative(root, file))} uses ${theme}.${token} on ${surface}`);
            }
          }
        }
      }
    }
  }

  const report = [
    `schema: ${requiredKeys.length}/40 keys in dark and light`,
    `provenance: ${Object.keys(provenance.canonicalTextSha256).length} accepted archive files verified`,
    `print: ${Object.keys(tokenFiles.print).length}/9 keys`,
    `generated CSS: ${Object.keys(tokenFiles.dark).length + Object.keys(tokenFiles.light).length + Object.keys(tokenFiles.print).length} entries`,
    `var() references: ${variableReferenceCount} checked, undefined 0 expected`,
    `hard-coded colors: ${Object.keys(actualHardcoded).length} path baselines checked`,
    `contrast: ${validatedRows} validated + ${excludedRows} excluded + ${decorativeRows} decorative-exempt + ${contrastContract.informationalRows} informational = ${reconciledRows}`,
  ];

  for (const line of report) console.log(`${errors.length ? '·' : '✓'} ${line}`);
  for (const error of errors) console.error(`✗ ${error}`);
  console.log(errors.length ? `FAIL (${errors.length} errors)` : 'OK — all design-token checks satisfied');

  return { errors, report };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const result = validate({
    rootDirectory: cliArgument('--root', '.'),
    tokenDirectory: cliArgument('--tokens', 'design-system/tokens'),
    sourceDirectory: cliArgument('--src', 'src'),
    outputPath: cliArgument('--output', 'src/styles/tokens.css'),
    allowlistPath: cliArgument('--allowlist', 'design-system/tokens/hardcoded-color-allowlist.json'),
    contrastContractPath: cliArgument('--contrast', 'design-system/tokens/contrast-contract.json'),
    provenancePath: cliArgument('--provenance', 'design-system/tokens/provenance.json'),
  });
  if (result.errors.length) process.exitCode = 1;
}
