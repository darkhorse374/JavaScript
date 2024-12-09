import color from 'chalk';
import * as v from 'valibot';
import type { Block, Category } from '.';
import * as ascii from '../ascii';
import type { RegistryConfig } from '../config';

const ruleLevelSchema = v.union([v.literal('off'), v.literal('warn'), v.literal('error')]);

export type RuleLevel = v.InferInput<typeof ruleLevelSchema>;

export type CheckOptions = {
	categories: Category[];
	options: (string | number)[];
	config: RegistryConfig;
};

export type Rule = {
	description: string;
	check: (block: Block, { categories }: CheckOptions) => string[] | undefined;
};

const rules = {
	'no-unpinned-dependency': {
		description: 'Require all dependencies to have a pinned version.',
		check: (block) => {
			const errors: string[] = [];

			for (const dep of [...block.dependencies, ...block.devDependencies]) {
				if (!dep.includes('@')) {
					errors.push(`Couldn't find a version to use for ${color.bold(dep)}`);
				}
			}

			return errors.length > 0 ? errors : undefined;
		},
	} satisfies Rule,
	'require-local-dependency-exists': {
		description: 'Require all local dependencies to exist.',
		check: (block, { categories }) => {
			const errors: string[] = [];

			for (const dep of block.localDependencies) {
				const [depCategoryName, depBlockName] = dep.split('/');

				const depCategory = categories.find(
					(cat) => cat.name.trim() === depCategoryName.trim()
				);

				const error = `${color.bold(`${block.category}/${block.name}`)} depends on local dependency ${color.bold(dep)} which doesn't exist`;

				if (!depCategory) {
					errors.push(error);
					continue;
				}

				if (depCategory.blocks.find((b) => b.name === depBlockName) === undefined) {
					errors.push(error);
				}
			}

			return errors.length > 0 ? errors : undefined;
		},
	} satisfies Rule,
	'no-category-index-file-dependency': {
		description: 'Disallow depending on the index file of a category.',
		check: (block, { categories }) => {
			const errors: string[] = [];

			for (const dep of block.localDependencies) {
				const [categoryName, name] = dep.split('/');

				if (name !== 'index') continue;

				const category = categories.find((cat) => cat.name === categoryName);

				if (!category) continue;

				const depBlock = category.blocks.find((b) => b.name === name);

				if (!depBlock) continue;

				errors.push(
					`${color.bold(`${block.category}/${block.name}`)} depends on ${color.bold(`${categoryName}/${name}`)}`
				);
			}

			return errors.length > 0 ? errors : undefined;
		},
	} satisfies Rule,
	'max-local-dependencies': {
		description: 'Enforces a limit on the amount of local dependencies a block can have.',
		check: (block, { options }) => {
			const errors: string[] = [];

			let limit: number;

			if (typeof options[0] !== 'number') {
				limit = 5;
			} else {
				limit = options[0];
			}

			if (block.localDependencies.length > limit) {
				errors.push(
					`${color.bold(`${block.category}/${block.name}`)} has too many local dependencies (${color.bold(block.localDependencies.length)}) limit (${color.bold(limit)})`
				);
			}

			return errors.length > 0 ? errors : undefined;
		},
	} satisfies Rule,
	'no-circular-dependency': {
		description: 'Disallow circular dependencies.',
		check: (block, { categories }) => {
			const errors: string[] = [];

			const specifier = `${block.category}/${block.name}`;

			const chain = searchForDep(specifier, block, categories);

			if (chain) {
				errors.push(
					`There is a circular dependency in ${color.bold(specifier)}: ${color.bold(chain.join(' -> '))}`
				);
			}

			return errors.length > 0 ? errors : undefined;
		},
	} satisfies Rule,
	'no-unused-block': {
		description: 'Disallow unused blocks. (Not listed and not a dependency of another block)',
		check: (block, { categories }) => {
			if (block.list) return;

			const specifier = `${block.category}/${block.name}`;

			const listedBlocks = categories.flatMap((cat) => cat.blocks).filter((b) => b.list);

			for (const block of listedBlocks) {
				const chain = searchForDep(specifier, block, categories);

				if (chain) return;
			}

			return [`${color.bold(specifier)} is unused and will be ${color.bold.red('removed')}`];
		},
	} satisfies Rule,
	'no-framework-dependency': {
		description: 'Disallow frameworks (Svelte, Vue, React) as dependencies.',
		check: (block) => {
			const errors: string[] = [];

			// Update this list as needed
			// Use the name of the package not the framework
			const FRAMEWORKS = new Set([
				// svelte
				'svelte',

				// vue
				'vue',
				'nuxt',

				// react
				'react',
				'react-dom',
				'next',
				'@remix-run/react',

				// misc
				'@builder.io/qwik',
				'astro',
				'solid-js',
				'@angular/core',
			]);

			const frameworkDeps = [...block.devDependencies, ...block.dependencies].filter((d) =>
				FRAMEWORKS.has(d)
			);

			if (frameworkDeps.length > 0) {
				for (const frameworkDep of frameworkDeps) {
					errors.push(
						`${color.bold(`${block.category}/${block.name}`)} depends on ${color.bold(frameworkDep)} causing it to be installed when added`
					);
				}
			}

			return errors.length > 0 ? errors : undefined;
		},
	} satisfies Rule,
} as const;

const ruleKeySchema = v.union([
	v.literal('no-category-index-file-dependency'),
	v.literal('no-unpinned-dependency'),
	v.literal('require-local-dependency-exists'),
	v.literal('max-local-dependencies'),
	v.literal('no-circular-dependency'),
	v.literal('no-unused-block'),
	v.literal('no-framework-dependency'),
]);

export type RuleKey = v.InferInput<typeof ruleKeySchema>;

const ruleConfigSchema = v.record(
	ruleKeySchema,
	v.union([
		ruleLevelSchema,
		v.tupleWithRest(
			[ruleLevelSchema, v.union([v.string(), v.number()])],
			v.union([v.string(), v.number()])
		),
	])
);

export type RuleConfig = v.InferInput<typeof ruleConfigSchema>;

const DEFAULT_CONFIG: RuleConfig = {
	'no-category-index-file-dependency': 'warn',
	'no-unpinned-dependency': 'warn',
	'require-local-dependency-exists': 'error',
	'max-local-dependencies': ['warn', 10],
	'no-circular-dependency': 'error',
	'no-unused-block': 'warn',
	'no-framework-dependency': 'warn',
} as const;

const runRules = (
	categories: Category[],
	config: RegistryConfig,
	ruleConfig: RuleConfig = DEFAULT_CONFIG
): { warnings: string[]; errors: string[] } => {
	const warnings: string[] = [];
	const errors: string[] = [];

	for (const category of categories) {
		for (const block of category.blocks) {
			for (const [name, rule] of Object.entries(rules)) {
				const conf = ruleConfig[name as RuleKey]!;

				let level: RuleLevel;
				const options: (string | number)[] = [];
				if (Array.isArray(conf)) {
					level = conf[0];
					options.push(...conf.slice(1));
				} else {
					level = conf;
				}

				if (level === 'off') continue;

				const ruleErrors = rule.check(block, { categories, options, config });

				if (!ruleErrors) continue;

				if (level === 'error') {
					errors.push(
						...ruleErrors.map(
							(err) =>
								`${ascii.VERTICAL_LINE}  ${ascii.ERROR} ${color.red(err)} ${color.gray(name)}`
						)
					);
					continue;
				}

				warnings.push(
					...ruleErrors.map(
						(err) => `${ascii.VERTICAL_LINE}  ${ascii.WARN} ${err} ${color.gray(name)}`
					)
				);
			}
		}
	}

	return { warnings, errors };
};

/** Searches for the local dependency tree for the provided specifier returns the path it took to find the dependency */
const searchForDep = (
	search: string,
	block: Block,
	categories: Category[],
	chain: string[] = []
): string[] | undefined => {
	const newChain = [...chain, `${block.category}/${block.name}`];

	for (const dep of block.localDependencies) {
		if (dep === search) return newChain;

		const [categoryName, blockName] = dep.split('/');

		const depBlock = categories
			.find((cat) => cat.name === categoryName)
			?.blocks.find((b) => b.name === blockName);

		if (!depBlock) continue;

		const found = searchForDep(search, depBlock, categories, newChain);

		if (found) return [...found, search];
	}

	return undefined;
};

/** Checks if the provided block is depended on anywhere */
const isDependedOn = (specifier: string, categories: Category[]): boolean => {
	for (const category of categories) {
		for (const block of category.blocks) {
			if (!block.list) continue;

			const chain = searchForDep(specifier, block, categories);

			if (chain) return true;
		}
	}

	return false;
};

export {
	rules,
	runRules,
	DEFAULT_CONFIG,
	ruleLevelSchema,
	ruleConfigSchema,
	ruleKeySchema,
	searchForDep,
	isDependedOn,
};
