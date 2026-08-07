/**
 * Attendance (active roster / consistency).
 *
 * Source: `guildData.guild(id).attendance(zoneID:1056)` — works for Classic.
 * Because logs are fragmented, a core's attendance is gathered from BOTH its own
 * guild object AND the parent guild filtered by the core's raid-team tag, then
 * merged (deduped by report code). Per player: raids attended / raids logged.
 */

import { teams as staticTeams } from '$lib/data/teams';
import type { WclEnv, WclAttendee, WclAttendance } from './types';
import {
	SSC_TK_ZONE_ID,
	ATTENDANCE_REPORTS,
	CLASS_NAME_TO_CLASS,
	CLASS_LABEL_ES,
	CLASS_COLOR
} from './constants';
import { getToken, gql } from './http';
import { PARENT_GUILD } from './core-attribution';
import { logWcl } from './logging';

type AttendancePlayer = { name?: string | null; type?: string | null; presence?: number | null };
type AttendanceReport = { code?: string | null; players?: AttendancePlayer[] | null };
type AttendanceNode = {
	guild?: { attendance?: { data?: AttendanceReport[] | null } | null } | null;
} | null;

/**
 * Build the batched attendance query: per core, one block for its own guild
 * object and one for the parent filtered to the core's tag. Cores without a
 * `wclTagId` only get the own-guild block.
 */
function buildAttendanceQuery(teams: { wclGuildId: number; wclTagId?: number }[]): string {
	const blocks: string[] = [];
	teams.forEach((t, i) => {
		blocks.push(`o${i}: guildData {
    guild(id: ${t.wclGuildId}) {
      attendance(zoneID: ${SSC_TK_ZONE_ID}, limit: ${ATTENDANCE_REPORTS}) {
        data { code players { name type presence } }
      }
    }
  }`);
		if (typeof t.wclTagId === 'number') {
			blocks.push(`t${i}: guildData {
    guild(id: ${PARENT_GUILD.wclGuildId}) {
      attendance(zoneID: ${SSC_TK_ZONE_ID}, guildTagID: ${t.wclTagId}, limit: ${ATTENDANCE_REPORTS}) {
        data { code players { name type presence } }
      }
    }
  }`);
		}
	});
	return `query {\n  ${blocks.join('\n  ')}\n}`;
}

/**
 * Fetch per-core attendance (active roster + consistency) in one batched query.
 * Each core merges its own-guild reports with the parent's reports for its tag,
 * deduped by report code. Resilient: missing creds / any error → null; cores
 * with no reports are simply absent from `perCore`.
 */
export async function getWclAttendance(env: WclEnv): Promise<WclAttendance | null> {
	try {
		const teams = staticTeams.filter(
			(t): t is typeof t & { wclGuildId: number } => typeof t.wclGuildId === 'number'
		);
		if (teams.length === 0) return null;

		const token = await getToken(env);
		if (!token) return null;

		const data = await gql<Record<string, AttendanceNode>>(token, buildAttendanceQuery(teams));
		if (!data) return null;

		const perCore: Record<number, WclAttendee[]> = {};
		teams.forEach((t, i) => {
			// Merge own-guild + parent-by-tag reports, deduped by report code.
			const reports = new Map<string, AttendanceReport>();
			for (const alias of [`o${i}`, `t${i}`]) {
				const rows = data[alias]?.guild?.attendance?.data ?? [];
				for (const r of rows) {
					const code = r?.code ?? undefined;
					if (code && !reports.has(code)) reports.set(code, r);
				}
			}
			const total = reports.size;
			if (total === 0) return;

			// name(lower) → attendee accumulator.
			const acc = new Map<string, WclAttendee>();
			for (const r of reports.values()) {
				for (const p of r.players ?? []) {
					const name = p?.name?.trim();
					if (!name) continue;
					const key = name.toLowerCase();
					let a = acc.get(key);
					if (!a) {
						const wowClass = p?.type ? CLASS_NAME_TO_CLASS[p.type] : undefined;
						a = {
							name,
							wowClass,
							classLabel: wowClass ? CLASS_LABEL_ES[wowClass] : undefined,
							classColor: wowClass ? CLASS_COLOR[wowClass] : undefined,
							attended: 0,
							total
						};
						acc.set(key, a);
					}
					// presence === 1 means the player was present that raid.
					if (p?.presence === 1) a.attended += 1;
				}
			}
			const list = [...acc.values()]
				.filter((a) => a.attended > 0)
				.sort((a, b) => b.attended - a.attended);
			if (list.length > 0) perCore[t.wclGuildId] = list;
		});

		if (Object.keys(perCore).length === 0) return null;
		return { perCore };
	} catch (e) {
		logWcl('getWclAttendance', { error: e instanceof Error ? e.message : String(e) });
		return null;
	}
}
