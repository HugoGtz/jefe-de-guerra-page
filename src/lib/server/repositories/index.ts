/**
 * Repository barrel. Each repository takes the injected Drizzle `Db` instance
 * and returns DOMAIN models (`$lib/data/*` types), never Drizzle row types.
 *
 * Reads feed the public site (via `data.ts`); writes + admin-list helpers feed
 * the /admin editors.
 */

export { getGuild, updateGuild, setAboutParagraphs, type GuildUpdate } from './guild.repository';
export { getPhases, withRaidProgress, phasePercent } from './raids.repository';
export {
	getTeams,
	createTeam,
	updateTeam,
	deleteTeam,
	type TeamInput
} from './teams.repository';
export {
	getOfficers,
	listOfficersAdmin,
	createOfficer,
	updateOfficer,
	deleteOfficer,
	type OfficerInput,
	type OfficerAdmin
} from './officers.repository';
export {
	getRecruitment,
	updateRecruitmentMeta,
	setNeeds,
	setRequirements,
	type RecruitmentMetaUpdate
} from './recruitment.repository';
export { getFeats } from './feats.repository';
export {
	getFaq,
	listFaqAdmin,
	createFaq,
	updateFaq,
	deleteFaq,
	type FaqAdmin,
	type FaqInput
} from './faq.repository';
export {
	getCommunityMeta,
	getRaidNights,
	updateCommunityMeta,
	setRaidNights,
	type CommunityMeta,
	type CommunityMetaUpdate
} from './community.repository';
export { getCache, setCache, type CacheEntry } from './wclCache.repository';
