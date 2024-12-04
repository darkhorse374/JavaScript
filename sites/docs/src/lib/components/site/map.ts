import * as Icons from '$lib/components/icons';

export type Category = {
	name: string;
	routes: Route[];
};

export type Route = {
	name: string;
	href: string;
	activeForSubdirectories?: boolean;
	hide?: boolean;
	icon?: typeof Icons.GitHub;
	routes?: Route[];
};

const categories: Category[] = [
	{
		name: 'routes',
		routes: [
			{
				name: 'Home',
				href: '/'
			},
			{
				name: 'Docs',
				href: '/docs'
			},
			{
				name: 'Demos',
				href: '/demos'
			}
		]
	},
	{
		name: 'Getting Started',
		routes: [
			{
				name: 'Introduction',
				href: '/docs'
			},
			{
				name: 'Setup',
				href: '/docs/setup',
				activeForSubdirectories: true,
				routes: [
					{
						name: 'Project Setup',
						href: '/docs/setup/project'
					},
					{
						name: 'Registry Setup',
						href: '/docs/setup/registry'
					}
				]
			},
			{
				name: 'jsrepo.json',
				href: '/docs/jsrepo-json'
			},
			{
				name: 'jsrepo-build-config.json',
				href: '/docs/jsrepo-build-config-json'
			},
			{
				name: 'CLI',
				href: '/docs/cli'
			},
			{
				name: 'Language Support',
				href: '/docs/language-support'
			},
			{
				name: 'Git Providers',
				href: '/docs/git-providers',
				activeForSubdirectories: true,
				routes: [
					{
						name: 'GitHub',
						href: '/docs/git-providers/github',
						icon: Icons.GitHub
					},
					{
						name: 'GitLab',
						href: '/docs/git-providers/gitlab',
						icon: Icons.GitLab
					},
					{
						name: 'BitBucket',
						href: '/docs/git-providers/bitbucket',
						icon: Icons.BitBucket
					}
				]
			},
			{
				name: 'Private Repositories',
				href: '/docs/private-repositories'
			},
			{
				name: 'Badges',
				href: '/docs/badges'
			},
			{
				name: 'About',
				href: '/docs/about'
			}
		]
	}
];

export { categories };
