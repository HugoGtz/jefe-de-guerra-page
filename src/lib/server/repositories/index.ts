/**
 * Repository barrel. Each repository takes the injected Drizzle `Db` instance
 * and returns DOMAIN models (`$lib/data/*` types), never Drizzle row types.
 *
 * Reads feed the public site (via `data.ts`); writes + admin-list helpers feed
 * the /admin editors.
 */

export { getGuild, updateGuild, setAboutParagraphs, type GuildUpdate } from './guild.repository';
export {
	getPhases,
	withRaidProgress,
	phasePercent,
	listPhasesAdmin,
	updatePhase,
	updateRaid,
	setBossesForRaid,
	type PhaseAdmin,
	type RaidAdmin,
	type BossAdmin,
	type PhaseInput,
	type RaidInput,
	type BossListInput
} from './raids.repository';
export { getTeams, createTeam, updateTeam, deleteTeam, type TeamInput } from './teams.repository';
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
export {
	getFeats,
	listFeatsAdmin,
	createFeat,
	updateFeat,
	deleteFeat,
	type FeatAdmin,
	type FeatInput
} from './feats.repository';
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
export {
	getCache,
	setCache,
	tryAcquireLock,
	deleteCache,
	type CacheEntry
} from './wclCache.repository';
export {
	getBossKills,
	upsertBossKills,
	deleteBossKill,
	type BossKillRow
} from './wclBossKills.repository';
export {
	createApplication,
	listApplicationsAdmin,
	markApplicationReviewed,
	type ApplicationInput,
	type ApplicationAdmin
} from './applications.repository';
export {
	countUsers,
	getByUsername,
	getById,
	createUser,
	updatePassword,
	listUsers,
	deleteUser,
	type UserListItem,
	type CreateUserInput
} from './users.repository';
