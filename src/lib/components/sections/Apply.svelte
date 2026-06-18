<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { reveal } from '$lib/actions/reveal';
	import type { Recruitment } from '$lib/data/recruitment';

	let { recruitment }: { recruitment: Recruitment } = $props();

	// Clases jugables de TBC (The Burning Crusade).
	const CLASSES = [
		'Guerrero',
		'Paladín',
		'Cazador',
		'Pícaro',
		'Sacerdote',
		'Chamán',
		'Mago',
		'Brujo',
		'Druida'
	] as const;

	type FormState = {
		character: string;
		class: string;
		spec: string;
		ilvl: string;
		logs: string;
		experience: string;
		availability: string;
		message: string;
	};

	const empty: FormState = {
		character: '',
		class: '',
		spec: '',
		ilvl: '',
		logs: '',
		experience: '',
		availability: '',
		message: ''
	};

	let form = $state<FormState>({ ...empty });
	let errors = $state<Partial<Record<keyof FormState, string>>>({});
	let status = $state<'idle' | 'sending' | 'success' | 'error'>('idle');
	let statusMessage = $state('');
	// Campo trampa anti-bots: debe quedar vacío. Si un bot lo rellena, se descarta.
	let honeypot = $state('');

	// El formulario envía a una Cloudflare Pages Function (/api/apply) que guarda
	// el webhook de Discord como SECRETO del servidor — nunca se expone al cliente.
	const APPLY_ENDPOINT = '/api/apply';
	const sending = $derived(status === 'sending');

	function validate(): boolean {
		const next: Partial<Record<keyof FormState, string>> = {};

		if (!form.character.trim()) {
			next.character = 'Indica el nombre de tu personaje.';
		}
		if (!form.class) {
			next.class = 'Selecciona tu clase.';
		}
		if (!form.spec.trim()) {
			next.spec = 'Indica tu especialización o rol.';
		}
		if (!form.ilvl.trim()) {
			next.ilvl = 'Indica tu nivel de equipo (ilvl).';
		} else if (!/^\d{2,4}$/.test(form.ilvl.trim())) {
			next.ilvl = 'Usa solo el número de ilvl (p. ej. 120).';
		}
		if (form.logs.trim() && !/^https?:\/\//i.test(form.logs.trim())) {
			next.logs = 'El enlace debe empezar por http(s)://';
		}
		if (!form.experience.trim()) {
			next.experience = 'Cuéntanos tu experiencia de raid.';
		}
		if (!form.availability.trim()) {
			next.availability = 'Indica qué noches tienes disponibles.';
		}

		errors = next;
		return Object.keys(next).length === 0;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (sending) return;
		if (honeypot) return; // bot detectado: ignorar en silencio
		if (!validate()) {
			status = 'error';
			statusMessage = 'Revisa los campos marcados antes de enviar.';
			return;
		}

		status = 'sending';
		statusMessage = 'Enviando tu aplicación…';

		try {
			// Enviamos los campos en crudo; la Function arma el mensaje de Discord
			// en el servidor con el webhook secreto.
			const res = await fetch(APPLY_ENDPOINT, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					character: form.character,
					wowClass: form.class,
					spec: form.spec,
					ilvl: form.ilvl,
					logs: form.logs,
					experience: form.experience,
					availability: form.availability,
					message: form.message,
					website: honeypot
				})
			});

			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}

			status = 'success';
			statusMessage = '¡Aplicación enviada! Un oficial revisará tu solicitud pronto.';
			form = { ...empty };
			errors = {};
		} catch {
			status = 'error';
			statusMessage =
				'No se pudo enviar la aplicación. Inténtalo de nuevo o escríbenos por Discord.';
		}
	}
</script>

<Section id="aplica" eyebrow="Da el paso" title="Aplica a la guild">
	<div class="apply surface" use:reveal={{ blur: true }}>
		{#if status === 'success'}
			<div class="apply__success">
				<h3 class="apply__success-title text-engraved">¡Bienvenido a la hueste!</h3>
				<p class="apply__success-text">{statusMessage}</p>
				<p class="apply__success-text">Ya puedes unirte a nuestros canales:</p>
				<div class="apply__join">
					<Button
						variant="primary"
						href={recruitment.discordUrl}
						target="_blank"
						rel="noopener noreferrer"
						pulse>Unirse por Discord</Button
					>
					<Button
						variant="ghost"
						href={recruitment.whatsappUrl}
						target="_blank"
						rel="noopener noreferrer">Grupo de WhatsApp</Button
					>
				</div>
			</div>
		{:else}
			<p class="apply__lead">
				Rellena tus datos y tu aplicación llega directo a nuestros oficiales por Discord.
			</p>
			<form class="apply__form" novalidate onsubmit={handleSubmit}>
				<!-- Honeypot anti-bots: oculto a usuarios; si se rellena, se descarta. -->
				<input
					class="apply__hp"
					type="text"
					tabindex="-1"
					autocomplete="off"
					aria-hidden="true"
					name="website"
					bind:value={honeypot}
				/>
				<div class="apply__grid">
					<div class="field">
						<label class="field__label" for="ap-character">Nombre de personaje</label>
						<input
							id="ap-character"
							class="field__input"
							type="text"
							autocomplete="off"
							bind:value={form.character}
							aria-required="true"
							aria-invalid={!!errors.character}
							aria-describedby={errors.character ? 'err-character' : undefined}
						/>
						{#if errors.character}
							<span id="err-character" class="field__error">{errors.character}</span>
						{/if}
					</div>

					<div class="field">
						<label class="field__label" for="ap-class">Clase</label>
						<select
							id="ap-class"
							class="field__input field__select"
							bind:value={form.class}
							aria-required="true"
							aria-invalid={!!errors.class}
							aria-describedby={errors.class ? 'err-class' : undefined}
						>
							<option value="" disabled>Selecciona una clase…</option>
							{#each CLASSES as c (c)}
								<option value={c}>{c}</option>
							{/each}
						</select>
						{#if errors.class}
							<span id="err-class" class="field__error">{errors.class}</span>
						{/if}
					</div>

					<div class="field">
						<label class="field__label" for="ap-spec">Especialización / rol</label>
						<input
							id="ap-spec"
							class="field__input"
							type="text"
							placeholder="p. ej. Restauración (sanador)"
							bind:value={form.spec}
							aria-required="true"
							aria-invalid={!!errors.spec}
							aria-describedby={errors.spec ? 'err-spec' : undefined}
						/>
						{#if errors.spec}
							<span id="err-spec" class="field__error">{errors.spec}</span>
						{/if}
					</div>

					<div class="field">
						<label class="field__label" for="ap-ilvl">Nivel de equipo (ilvl)</label>
						<input
							id="ap-ilvl"
							class="field__input"
							type="text"
							inputmode="numeric"
							placeholder="p. ej. 120"
							bind:value={form.ilvl}
							aria-required="true"
							aria-invalid={!!errors.ilvl}
							aria-describedby={errors.ilvl ? 'err-ilvl' : undefined}
						/>
						{#if errors.ilvl}
							<span id="err-ilvl" class="field__error">{errors.ilvl}</span>
						{/if}
					</div>

					<div class="field field--full">
						<label class="field__label" for="ap-logs">
							Enlace de WarcraftLogs <span class="field__optional">(opcional)</span>
						</label>
						<input
							id="ap-logs"
							class="field__input"
							type="url"
							placeholder="https://www.warcraftlogs.com/character/…"
							bind:value={form.logs}
							aria-invalid={!!errors.logs}
							aria-describedby={errors.logs ? 'err-logs' : undefined}
						/>
						{#if errors.logs}
							<span id="err-logs" class="field__error">{errors.logs}</span>
						{/if}
					</div>

					<div class="field field--full">
						<label class="field__label" for="ap-experience">Experiencia de raid</label>
						<textarea
							id="ap-experience"
							class="field__input field__textarea"
							rows="4"
							placeholder="Servidores, guilds, progreso conseguido…"
							bind:value={form.experience}
							aria-required="true"
							aria-invalid={!!errors.experience}
							aria-describedby={errors.experience ? 'err-experience' : undefined}
						></textarea>
						{#if errors.experience}
							<span id="err-experience" class="field__error">{errors.experience}</span>
						{/if}
					</div>

					<div class="field field--full">
						<label class="field__label" for="ap-availability">Disponibilidad</label>
						<input
							id="ap-availability"
							class="field__input"
							type="text"
							placeholder="p. ej. Lunes, miércoles y jueves de noche"
							bind:value={form.availability}
							aria-required="true"
							aria-invalid={!!errors.availability}
							aria-describedby={errors.availability ? 'err-availability' : undefined}
						/>
						{#if errors.availability}
							<span id="err-availability" class="field__error">{errors.availability}</span>
						{/if}
					</div>

					<div class="field field--full">
						<label class="field__label" for="ap-message">
							Mensaje <span class="field__optional">(opcional)</span>
						</label>
						<textarea
							id="ap-message"
							class="field__input field__textarea"
							rows="3"
							placeholder="Cualquier cosa que quieras que sepamos."
							bind:value={form.message}
						></textarea>
					</div>
				</div>

				<div class="apply__actions">
					<Button variant="primary" type="submit" disabled={sending} beam>
						{sending ? 'Enviando…' : 'Enviar aplicación'}
					</Button>
				</div>
			</form>

			{#if status === 'error'}
				<!-- Error anunciado a lectores de pantalla. -->
				<p class="apply__status apply__status--error" role="status" aria-live="polite">
					{statusMessage}
				</p>
			{/if}
		{/if}
	</div>
</Section>

<style>
	.apply {
		max-width: 44rem;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 2.5rem);
		border-radius: 8px;
	}

	/* Honeypot anti-bots: fuera de pantalla, invisible y no enfocable. */
	.apply__hp {
		position: absolute;
		left: -9999px;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}
	.apply__lead {
		margin: 0 0 1.75rem;
		text-align: center;
		color: var(--color-steel);
		line-height: 1.65;
	}
	/* Estado de éxito: bienvenida + botones de unirse (revelados al aplicar). */
	.apply__success {
		text-align: center;
		padding: clamp(0.5rem, 3vw, 1.5rem) 0;
	}
	.apply__success-title {
		font-size: clamp(1.5rem, 4vw, 2rem);
		margin: 0 0 0.75rem;
		color: var(--color-silver);
	}
	.apply__success-text {
		margin: 0 0 0.6rem;
		color: var(--color-steel);
		line-height: 1.6;
	}
	.apply__join {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
		margin-top: 1.6rem;
	}

	.apply__grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.field--full {
		grid-column: 1 / -1;
	}

	.field__label {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 0.82rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-silver);
	}
	.field__optional {
		font-weight: 400;
		text-transform: none;
		letter-spacing: 0;
		color: var(--color-steel-dim);
	}

	.field__input {
		width: 100%;
		padding: 0.65rem 0.8rem;
		font-family: var(--font-sans);
		font-size: 0.95rem;
		color: var(--color-silver);
		background-color: var(--color-ash);
		border: 1px solid color-mix(in srgb, var(--color-steel) 30%, transparent);
		border-radius: 3px;
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}
	.field__input::placeholder {
		color: var(--color-steel-dim);
	}
	.field__input:hover {
		border-color: color-mix(in srgb, var(--color-steel) 50%, transparent);
	}
	.field__input:focus {
		outline: none;
		border-color: var(--color-lava);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-lava) 22%, transparent);
	}
	.field__input[aria-invalid='true'] {
		border-color: var(--color-blood);
	}

	.field__select {
		appearance: none;
		cursor: pointer;
	}
	.field__textarea {
		resize: vertical;
		min-height: 4.5rem;
		line-height: 1.55;
	}

	.field__error {
		color: var(--color-ember);
		font-size: 0.8rem;
		line-height: 1.3;
	}

	.apply__actions {
		margin-top: 1.5rem;
		display: flex;
		justify-content: center;
	}

	.apply__status {
		margin: 1.25rem 0 0;
		text-align: center;
		font-size: 0.92rem;
		line-height: 1.5;
		color: var(--color-steel);
		/* Reservar espacio sin saltos cuando está vacío. */
		min-height: 1.4em;
	}
	.apply__status:empty {
		margin-top: 0;
	}
	.apply__status--error {
		color: var(--color-ember);
	}

	@media (min-width: 560px) {
		.apply__grid {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
