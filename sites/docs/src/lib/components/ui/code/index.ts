/*
	jsrepo 1.18.0
	Installed from github/ieedan/shadcn-svelte-extras
	12-10-2024
*/

import type { Writable } from 'svelte/store';
import Code from './code.svelte';
import ShikiProvider from './shiki-provider.svelte';
import { type BundledLanguage, type HighlighterGeneric, type BundledTheme } from 'shiki';
import { context } from '$lib/utils/context-provider';

const HIGHLIGHTER_CONTEXT_KEY = 'shiki-highlighter';

/** Used to access the highlighter context provided by `<ShikiProvider/>`. */
export const shikiContext = context<Highlighter | undefined>(HIGHLIGHTER_CONTEXT_KEY);

export type Highlighter = HighlighterGeneric<BundledLanguage, BundledTheme>;

export type HighlighterStore = Writable<Highlighter | undefined>;

export { Code, ShikiProvider };
