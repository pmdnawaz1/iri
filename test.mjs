import { readFileSync } from 'fs';
import { GoAdapter } from './packages/code-compiler/dist/index.js';
const src = readFileSync('./fixtures/go/repository.go', 'utf-8');
const adapter = new GoAdapter();
console.log(JSON.stringify(adapter.parse('repository.go', src, { logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, child: () => ({}) } }), null, 2));
