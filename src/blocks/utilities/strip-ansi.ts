/*
	ts-blocks 1.0.0-next.17
	Installed from github/ieedan/std
	11-18-2024
*/

import ansiRegex from 'ansi-regex';

/** Strips a string with ansi escape codes back to it's original form. Useful for when you need to get the actual length of a string.
 *
 * @param str
 * @returns
 *
 * ## Usage
 * ```ts
 * import color from "chalk";
 *
 * const redString = color.red(redString);
 *
 * stripAnsi(redString);
 * ```
 */
const stripAsni = (str: string) => str.replace(ansiRegex(), '');

export { stripAsni };
