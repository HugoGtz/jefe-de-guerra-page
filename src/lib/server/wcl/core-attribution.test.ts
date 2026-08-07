import { describe, it, expect } from 'vitest';
import {
	defaultSources,
	tagToCore,
	resolveCore,
	coreTeams,
	PARENT_GUILD
} from './core-attribution';

describe('core-attribution', () => {
	it('coreTeams only returns teams with a wclGuildId', () => {
		const teams = coreTeams();
		expect(teams.length).toBeGreaterThan(0);
		for (const t of teams) expect(typeof t.wclGuildId).toBe('number');
	});

	it('defaultSources starts with the parent guild followed by every core', () => {
		const sources = defaultSources();
		expect(sources[0]).toEqual(PARENT_GUILD);
		expect(sources.length).toBe(coreTeams().length + 1);
	});

	it('tagToCore maps a known tag id to its core', () => {
		const map = tagToCore();
		const core4 = coreTeams().find((t) => t.name === 'Core 4');
		expect(core4?.wclTagId).toBeDefined();
		const entry = map.get(core4!.wclTagId!);
		expect(entry).toEqual({ wclGuildId: core4!.wclGuildId, name: 'Core 4' });
	});

	it('resolveCore returns the source itself for a non-parent guild, ignoring guildTag', () => {
		const source = { wclGuildId: 111, name: 'Core X' };
		const resolved = resolveCore(source, { id: 999, name: 'unrelated' }, new Map());
		expect(resolved).toEqual({ wclGuildId: 111, name: 'Core X' });
	});

	it('resolveCore attributes a parent report to the tagged core when the tag is known', () => {
		const tagMap = new Map([[76396, { wclGuildId: 826907, name: 'Core 4' }]]);
		const resolved = resolveCore(PARENT_GUILD, { id: 76396, name: 'Core 4' }, tagMap);
		expect(resolved).toEqual({ wclGuildId: 826907, name: 'Core 4' });
	});

	it('resolveCore falls back to the parent ("General") when the tag is null or unknown', () => {
		const tagMap = new Map([[76396, { wclGuildId: 826907, name: 'Core 4' }]]);
		expect(resolveCore(PARENT_GUILD, null, tagMap)).toEqual({
			wclGuildId: PARENT_GUILD.wclGuildId,
			name: PARENT_GUILD.name
		});
		expect(resolveCore(PARENT_GUILD, { id: 99999, name: 'unknown' }, tagMap)).toEqual({
			wclGuildId: PARENT_GUILD.wclGuildId,
			name: PARENT_GUILD.name
		});
	});
});
