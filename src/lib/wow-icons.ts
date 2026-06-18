/**
 * WoW class / spec icon helpers (shared by Officers + Salón de la Fama).
 *
 * Icons are vendored under `static/icons/` and served at `/icons/...`:
 *   - Class: `/icons/class/<classSlug>.png`
 *   - Spec:  `/icons/spec/<classSlug>/<specSlug>.png`
 *
 * All helpers are defensive: unknown class/spec → `null`, so callers fall back
 * to the class icon (or nothing). Never throws.
 */

/** English class name (officers/WCL rankings) → lowercase icon slug. */
const CLASS_NAME_TO_SLUG: Record<string, string> = {
	warrior: 'warrior',
	paladin: 'paladin',
	hunter: 'hunter',
	rogue: 'rogue',
	priest: 'priest',
	shaman: 'shaman',
	mage: 'mage',
	warlock: 'warlock',
	druid: 'druid'
};

/** WCL/Blizzard classID → lowercase icon slug (TBC class set). */
const CLASS_ID_TO_SLUG: Record<number, string> = {
	1: 'warrior',
	2: 'paladin',
	3: 'hunter',
	4: 'rogue',
	5: 'priest',
	7: 'shaman',
	8: 'mage',
	9: 'warlock',
	11: 'druid'
};

/**
 * Known spec slugs per class (exactly the vendored files under
 * `static/icons/spec/<class>/`). Used to validate a normalized spec name before
 * returning a URL.
 */
export const SPEC_BY_CLASS: Record<string, readonly string[]> = {
	warrior: ['arms', 'fury', 'protection'],
	paladin: ['holy', 'protection', 'retribution'],
	hunter: ['beastmastery', 'marksman', 'survival'],
	rogue: ['assassination', 'combat', 'subtlety'],
	priest: ['discipline', 'holy', 'shadow'],
	shaman: ['elemental', 'enhancement', 'restoration'],
	mage: ['arcane', 'fire', 'frost'],
	warlock: ['affliction', 'demonology', 'destruction'],
	druid: ['balance', 'feral', 'guardian', 'restoration']
};

/**
 * Spec-name aliases applied after normalization (lowercase, alnum-only). Maps
 * common WCL spec labels onto our vendored slug names.
 */
const SPEC_ALIASES: Record<string, string> = {
	marksmanship: 'marksman',
	beastmaster: 'beastmastery',
	beast: 'beastmastery'
};

/**
 * Resolve a class slug from either an English class name ('Warrior'…) or a
 * WCL classID number. Returns `null` if unknown.
 */
export function classSlug(input: string | number | null | undefined): string | null {
	if (input == null) return null;
	if (typeof input === 'number') {
		return CLASS_ID_TO_SLUG[input] ?? null;
	}
	const key = input.trim().toLowerCase();
	return CLASS_NAME_TO_SLUG[key] ?? null;
}

/** `/icons/class/<slug>.png`, or `null` if the class is unknown. */
export function classIconUrl(input: string | number | null | undefined): string | null {
	const slug = classSlug(input);
	return slug ? `/icons/class/${slug}.png` : null;
}

/** Normalize a spec name to a comparable slug: lowercase, strip non-alphanumerics. */
function normalizeSpec(specName: string): string {
	return specName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/* ----------------------------------------------------------------------------
 * Boss icons (Últimas hazañas / feats timeline)
 *
 * Self-hosted Wowhead achievement-boss icons, vendored under
 * `static/icons/boss/<base>.jpg` and served at `/icons/boss/<base>.jpg`.
 *
 * `bossIconUrl()` ALWAYS returns a usable URL: a mapped icon when we have one,
 * otherwise the generic `_generic.jpg` fallback. It never throws and never
 * yields a broken/404 path, so adding a new boss to the feed can never break
 * the UI — an unmapped boss simply shows the generic icon.
 *
 * Lookups are accent/case/punctuation-insensitive, so the same map serves both
 * the WCL English boss names AND the Spanish names used in `data/kills.ts`.
 *
 * ADDING A FUTURE BOSS (one line + one file):
 *   1. Find its Wowhead icon base name, e.g. `achievement_boss_foo`.
 *   2. Verify it exists (only commit icons that 200):
 *        curl -s -o /tmp/x.jpg -w "%{http_code}" \
 *          https://wow.zamimg.com/images/wow/icons/large/achievement_boss_foo.jpg
 *        file /tmp/x.jpg   # must say "JPEG"
 *   3. Download it:
 *        curl -s -o static/icons/boss/achievement_boss_foo.jpg \
 *          https://wow.zamimg.com/images/wow/icons/large/achievement_boss_foo.jpg
 *   4. Add ONE line below: '<WCL boss name>': 'achievement_boss_foo'
 *      (optionally also add the Spanish display name as another key).
 *   If you skip it, the boss just falls back to the generic icon. No breakage.
 * ------------------------------------------------------------------------- */

/** File base name (no extension) of the generic fallback boss icon. */
const GENERIC_BOSS_ICON = '_generic';

/**
 * Boss name → vendored icon file base name (under `static/icons/boss/`).
 *
 * Contains ONLY icons that have been verified (HTTP 200 + JPEG) and downloaded.
 * Keys cover both the WCL English boss name and the Spanish display name used
 * in `data/kills.ts`; lookups are normalized so either form resolves.
 *
 * Verified + vendored TBC/future bosses: Lady Vashj, Magtheridon, Gruul,
 * Illidan Stormrage, Kil'jaeden. (Most other TBC raid bosses have no
 * `achievement_boss_*` icon on the modern client — they use the fallback.)
 */
export const BOSS_ICONS: Record<string, string> = {
	// Lady Vashj (SSC)
	'Lady Vashj': 'achievement_boss_ladyvashj',
	// Magtheridon
	Magtheridon: 'achievement_boss_magtheridon',
	'Magtheridon the Pit Lord': 'achievement_boss_magtheridon',
	// Gruul the Dragonkiller / Gran Señor Gruul
	'Gruul the Dragonkiller': 'achievement_boss_gruul',
	'Gran Señor Gruul': 'achievement_boss_gruul',
	// Illidan Stormrage (future content)
	'Illidan Stormrage': 'achievement_boss_illidan',
	// Kil'jaeden (future content) — note the icon base is "kiljaedan"
	"Kil'jaeden": 'achievement_boss_kiljaedan',
	'Kil’jaeden': 'achievement_boss_kiljaedan'
};

/**
 * Normalize a boss name for matching: lowercase, fold common accents, drop any
 * apostrophe/punctuation/whitespace. Makes "Kil'jaeden", "Kil’jaeden" and
 * "kiljaeden" all equal, and "Gran Señor Gruul" → "gransenorgruul".
 */
function normalizeBoss(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '') // strip diacritics
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

/** Pre-normalized lookup built once from BOSS_ICONS (handles accents/punct). */
const NORMALIZED_BOSS_ICONS: Record<string, string> = Object.fromEntries(
	Object.entries(BOSS_ICONS).map(([k, v]) => [normalizeBoss(k), v])
);

/**
 * `/icons/boss/<base>.jpg` for a known boss, else `/icons/boss/_generic.jpg`.
 * Always returns a valid, vendored path — never `null`, never a 404.
 */
export function bossIconUrl(bossName: string | null | undefined): string {
	const base =
		(bossName && NORMALIZED_BOSS_ICONS[normalizeBoss(bossName)]) || GENERIC_BOSS_ICON;
	return `/icons/boss/${base}.jpg`;
}

/**
 * `/icons/spec/<classSlug>/<specSlug>.png` when the (normalized + aliased) spec
 * is a known spec for that class, otherwise `null` (caller falls back to the
 * class icon).
 */
export function specIconUrl(
	classInput: string | number | null | undefined,
	specName: string | null | undefined
): string | null {
	const cls = classSlug(classInput);
	if (!cls || !specName) return null;
	let spec = normalizeSpec(specName);
	if (!spec) return null;
	spec = SPEC_ALIASES[spec] ?? spec;
	const known = SPEC_BY_CLASS[cls];
	if (!known || !known.includes(spec)) return null;
	return `/icons/spec/${cls}/${spec}.png`;
}

/* ----------------------------------------------------------------------------
 * Spanish recruitment-label resolver
 *
 * The recruitment needs (`data/recruitment.ts`, sourced from D1) are free-text
 * Spanish labels like "Chamán elemental" or "Brujos". This resolver maps such a
 * label to an English class name + English spec slug so the existing
 * `classIconUrl` / `specIconUrl` helpers can be reused, plus the canonical WoW
 * class color for tasteful accents.
 *
 * It is intentionally general (token-based, not a fixed list of the current 9
 * needs) and fully defensive: an unrecognized label yields `wowClass: null`,
 * letting the caller fall back to the existing pill / first-letter style. Never
 * throws.
 * ------------------------------------------------------------------------- */

/** Canonical WoW class colors, keyed by lowercase English class name. */
export const CLASS_COLORS: Record<string, string> = {
	warrior: '#C79C6E',
	paladin: '#F58CBA',
	hunter: '#ABD473',
	rogue: '#FFF569',
	priest: '#FFFFFF',
	shaman: '#0070DE',
	mage: '#69CCF0',
	warlock: '#8787ED',
	druid: '#FF7D0A'
};

/** Fold accents/case and strip non-alphanumerics for resilient matching. */
function foldToken(token: string): string {
	return token
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '') // strip diacritics
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

/** Spanish class word (accent/plural-folded) → English class name. */
const ES_CLASS_TO_EN: Record<string, string> = {
	chaman: 'Shaman',
	chamanes: 'Shaman',
	druida: 'Druid',
	druidas: 'Druid',
	paladin: 'Paladin',
	paladines: 'Paladin',
	brujo: 'Warlock',
	brujos: 'Warlock',
	brujas: 'Warlock',
	cazador: 'Hunter',
	cazadores: 'Hunter',
	sacerdote: 'Priest',
	sacerdotes: 'Priest',
	guerrero: 'Warrior',
	guerreros: 'Warrior',
	mago: 'Mage',
	magos: 'Mage',
	picaro: 'Rogue',
	picaros: 'Rogue'
};

/** Spanish spec word (accent-folded) → English spec slug. */
const ES_SPEC_TO_EN: Record<string, string> = {
	elemental: 'elemental',
	mejora: 'enhancement',
	restauracion: 'restoration',
	balance: 'balance',
	equilibrio: 'balance',
	feral: 'feral',
	tanque: 'guardian',
	guardian: 'guardian',
	proteccion: 'protection',
	sombras: 'shadow',
	sombra: 'shadow',
	disciplina: 'discipline',
	sagrado: 'holy',
	reprension: 'retribution',
	reckoning: 'retribution',
	afliccion: 'affliction',
	demonologia: 'demonology',
	destruccion: 'destruction',
	punteria: 'marksman',
	supervivencia: 'survival',
	bestias: 'beastmastery',
	armas: 'arms',
	furia: 'fury',
	asesinato: 'assassination',
	combate: 'combat',
	sutileza: 'subtlety',
	escarcha: 'frost',
	fuego: 'fire',
	arcano: 'arcane'
};

export type ResolvedNeed = {
	/** English class name (e.g. 'Shaman'), or `null` if unrecognized. */
	wowClass: string | null;
	/** English spec slug (e.g. 'elemental'), or `null` if none recognized. */
	spec: string | null;
	/** Best icon URL (spec → class), or `null` if class unknown. */
	iconUrl: string | null;
	/** Canonical class color for accents, or `null` if class unknown. */
	color: string | null;
};

/**
 * Resolve a Spanish recruitment label to its WoW class/spec, icon URL and
 * class color. The first token is treated as the class word; any later token
 * may be a spec word. Returns nulls for anything unrecognized so callers can
 * fall back gracefully.
 */
export function resolveRecruitNeed(label: string | null | undefined): ResolvedNeed {
	const empty: ResolvedNeed = { wowClass: null, spec: null, iconUrl: null, color: null };
	if (!label) return empty;

	const tokens = label.split(/\s+/).map(foldToken).filter(Boolean);
	if (tokens.length === 0) return empty;

	const wowClass = ES_CLASS_TO_EN[tokens[0]] ?? null;
	if (!wowClass) return empty;

	let spec: string | null = null;
	for (const tok of tokens.slice(1)) {
		const candidate = ES_SPEC_TO_EN[tok];
		if (candidate) {
			spec = candidate;
			break;
		}
	}

	const iconUrl = (spec && specIconUrl(wowClass, spec)) || classIconUrl(wowClass);
	const color = CLASS_COLORS[wowClass.toLowerCase()] ?? null;

	return { wowClass, spec, iconUrl, color };
}
