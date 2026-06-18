/**
 * El Consejo de Guerra: oficiales y raid leaders de la hermandad.
 * `wowClass`, `classLabel` y `line` son opcionales (se muestran si existen).
 */

export type WowClass =
	| 'Warrior'
	| 'Paladin'
	| 'Hunter'
	| 'Rogue'
	| 'Priest'
	| 'Shaman'
	| 'Mage'
	| 'Warlock'
	| 'Druid';

export type Officer = {
	/** Nombre del personaje. */
	name: string;
	/** Rol dentro de la guild (en español), p. ej. "Oficial" o "Raid Líder". */
	role: string;
	/** Clase (opcional). */
	wowClass?: WowClass;
	/** Clase en español para mostrar (opcional). */
	classLabel?: string;
	/** Frase corta / lema personal (opcional). */
	line?: string;
};

export const officers: Officer[] = [
	// ── Oficiales ──
	{ name: 'Yuliox', role: 'Oficial' },
	{ name: 'Gelvez', role: 'Oficial' },
	{ name: 'Zorkian', role: 'Oficial' },
	{ name: 'Kaniser', role: 'Oficial' },
	{ name: 'Darkmorrigan', role: 'Oficial' },
	{ name: 'Zaenghun', role: 'Oficial' },
	// ── Raid Líderes ──
	{ name: 'Bélcebuu', role: 'Raid Líder' },
	{ name: 'Suuyeom', role: 'Raid Líder' },
	{ name: 'Chulengo', role: 'Raid Líder' },
	{ name: 'Frido', role: 'Raid Líder' },
	{ name: 'Dortakus', role: 'Raid Líder' },
	{ name: 'Sephiworm', role: 'Raid Líder' },
	{ name: 'Gelatine', role: 'Raid Líder' }
];
