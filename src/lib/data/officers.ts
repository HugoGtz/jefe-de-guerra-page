/**
 * Oficiales y líderes de raid.
 * Nombres y datos son placeholders — el usuario debe confirmarlos.
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
	/** Rol dentro de la guild (en español). */
	role: string;
	wowClass: WowClass;
	/** Clase en español para mostrar. */
	classLabel: string;
	/** Frase corta / lema personal. */
	line: string;
};

// TODO: confirmar nombres, clases y roles reales con el usuario
export const officers: Officer[] = [
	{
		name: 'Grommash',
		role: 'Líder de Guild',
		wowClass: 'Warrior',
		classLabel: 'Guerrero',
		line: 'Funda la estrategia y mantiene firme el estandarte de la Horda.'
	},
	{
		name: 'Thalyssra',
		role: 'Raid Leader',
		wowClass: 'Shaman',
		classLabel: 'Chamán',
		line: 'Marca el ritmo de cada pull y no perdona una mecánica fallada.'
	},
	{
		name: 'Drakthar',
		role: 'Oficial',
		wowClass: 'Warlock',
		classLabel: 'Brujo',
		line: 'Gestiona el loot y mantiene el orden en el caos del raid.'
	},
	{
		name: 'Sylvara',
		role: 'Reclutadora',
		wowClass: 'Priest',
		classLabel: 'Sacerdote',
		line: 'La primera cara amable que verás al unirte a la hermandad.'
	}
];
