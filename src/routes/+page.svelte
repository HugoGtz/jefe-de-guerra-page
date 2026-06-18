<script lang="ts">
	import Hero from '$lib/components/sections/Hero.svelte';
	import About from '$lib/components/sections/About.svelte';
	import RaidProgress from '$lib/components/sections/RaidProgress.svelte';
	import Feats from '$lib/components/sections/Feats.svelte';
	import Teams from '$lib/components/sections/Teams.svelte';
	import Community from '$lib/components/sections/Community.svelte';
	import Recruitment from '$lib/components/sections/Recruitment.svelte';
	import Faq from '$lib/components/sections/Faq.svelte';
	import Apply from '$lib/components/sections/Apply.svelte';
	import Officers from '$lib/components/sections/Officers.svelte';
	import LavaDivider from '$lib/components/LavaDivider.svelte';

	// Datos de SSR (+layout.server.ts): mismas claves/shapes que $lib/data/*.
	let { data } = $props();

	// TODO: cambiar por el dominio real tras desplegar (Cloudflare Pages).
	// Debe ser absoluto: Discord/WhatsApp/Twitter exigen URL absoluta en og:image.
	const siteUrl = 'https://jefe-de-guerra.pages.dev';
	const ogImage = `${siteUrl}/og-image.png`;

	// Datos estructurados (SEO). Ayuda a buscadores a entender la entidad.
	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'Jefe de Guerra',
		alternateName: 'Jefe de Guerra · Horda · Dreamscythe',
		url: siteUrl,
		logo: `${siteUrl}/icon-512.png`,
		image: ogImage,
		description:
			'Hermandad de la Horda en el servidor Dreamscythe (World of Warcraft: The Burning Crusade Classic). Raids de Fase 2: Serpentshrine Cavern y Tempest Keep.',
		sameAs: [data.recruitment.discordUrl, data.recruitment.whatsappUrl]
	});
</script>

<svelte:head>
	<title>Jefe de Guerra · Horda · Dreamscythe</title>
	<meta
		name="description"
		content="Jefe de Guerra — hermandad de la Horda en Dreamscythe (TBC Classic). Fase 1 completada al 100%, ahora progresando en SSC y Tempest Keep. Reclutamiento abierto."
	/>
	<link rel="canonical" href={siteUrl} />

	<!-- Open Graph (Discord, WhatsApp, Facebook…) -->
	<meta property="og:title" content="Jefe de Guerra · Horda · Dreamscythe" />
	<meta
		property="og:description"
		content="El orgullo de la Horda en Dreamscythe. Raids serios, buen ambiente y reclutamiento abierto para la Fase 2 de TBC Classic."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content={siteUrl} />
	<meta property="og:site_name" content="Jefe de Guerra" />
	<meta property="og:locale" content="es_ES" />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Emblema de la guild Jefe de Guerra" />

	<!-- Twitter / X -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Jefe de Guerra · Horda · Dreamscythe" />
	<meta
		name="twitter:description"
		content="El orgullo de la Horda en Dreamscythe. Reclutamiento abierto para la Fase 2 de TBC Classic."
	/>
	<meta name="twitter:image" content={ogImage} />

	<!-- Datos estructurados -->
	{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}<\/script>`}
</svelte:head>

<Hero guild={data.guild} />
<About guild={data.guild} />
<LavaDivider />
<RaidProgress phases={data.phases} stats={data.stats} />
<LavaDivider />
<Feats feats={data.feats} />
<LavaDivider />
<Teams teams={data.teams} />
<LavaDivider />
<Community guild={data.guild} community={data.community} discordUrl={data.recruitment.discordUrl} />
<LavaDivider />
<Recruitment recruitment={data.recruitment} />
<LavaDivider />
<Faq faq={data.faq} />
<LavaDivider />
<Apply recruitment={data.recruitment} />
<LavaDivider />
<Officers officers={data.officers} />
