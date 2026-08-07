<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import ParseBadge from '$lib/components/ui/ParseBadge.svelte';
	import ClassSpecIcon from '$lib/components/ui/ClassSpecIcon.svelte';
	import { specOrClassIcon, classColor, playerHref } from '$lib/wow-icons';
	import { parseTier, roleLabelEs } from '$lib/parse';
	import type { WowClass } from '$lib/data/officers';

	type Member = {
		name: string;
		wowClass?: WowClass;
		spec?: string;
		classLabel?: string;
		specRole?: 'DPS' | 'Healer' | 'Tank';
		score?: number | null;
	};

	let { member }: { member: Member } = $props();

	const icon = $derived(specOrClassIcon(member.wowClass, member.spec?.toLowerCase()));
	const tint = $derived(classColor(member.wowClass));
</script>

<a class="member" href={playerHref(member.name)} aria-label={`Ver los parses de ${member.name}`}>
	<Card class="member-card">
		<div class="member__row">
			{#if icon}
				<ClassSpecIcon
					src={icon}
					size={44}
					alt={member.spec ?? member.classLabel ?? member.wowClass ?? 'Clase'}
					class="member__icon"
				/>
			{:else}
				<span class="member__icon member__icon--letter" aria-hidden="true"
					>{member.name.charAt(0)}</span
				>
			{/if}

			<div class="member__body">
				<span class="member__name" title={member.name} style={tint ? `color: ${tint}` : ''}>
					{member.name}
				</span>
				<span class="member__meta">
					{#if member.spec}{member.spec}{/if}
					{#if member.spec && member.specRole}<span class="member__dot">·</span>{/if}
					{#if member.specRole}{roleLabelEs(member.specRole)}{/if}
				</span>
			</div>

			{#if member.score != null}
				{@const tier = parseTier(member.score)}
				<ParseBadge
					score={member.score}
					size="md"
					title={`Parse ${member.score} · ${tier.label} — mejor parse en SSC/TK (WarcraftLogs)`}
					ariaLabel={`Parse ${member.score} · ${tier.label}`}
				/>
			{/if}
		</div>
	</Card>
</a>

<style>
	.member {
		display: block;
		text-decoration: none;
		border-radius: var(--radius-lg);
		transition: transform 0.2s ease;
	}
	.member:hover {
		transform: translateY(-2px);
	}
	.member:focus-visible {
		outline: 2px solid var(--color-lava);
		outline-offset: 3px;
		border-radius: var(--radius-lg);
	}
	:global(.member-card) {
		height: 100%;
		padding: var(--spacing-lg) var(--spacing-xl);
	}
	.member__row {
		display: flex;
		align-items: center;
		gap: var(--spacing-lg);
	}
	/* :global — el <img> lo renderiza ClassSpecIcon (hijo); el span de inicial
	   (.member__icon--letter, local) también hereda esta base. */
	:global(.member__icon) {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-lg);
		object-fit: cover;
		border: 1px solid color-mix(in srgb, var(--color-steel) 34%, transparent);
		box-shadow: inset 0 1px 0 rgba(229, 229, 229, 0.1);
		background: color-mix(in srgb, var(--color-stone) 75%, transparent);
	}
	.member__icon--letter {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 900;
		color: var(--color-silver);
		background: linear-gradient(135deg, var(--color-crimson-deep), var(--color-blood));
	}
	.member__body {
		min-width: 0;
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	.member__name {
		font-weight: 700;
		letter-spacing: var(--tracking-snug);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--color-silver);
	}
	.member__meta {
		font-size: var(--text-xs);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		color: var(--color-steel-dim);
	}
	.member__dot {
		margin: 0 var(--spacing-3xs);
	}

	@media (prefers-reduced-motion: reduce) {
		.member:hover {
			transform: none;
		}
	}
</style>
