// Banc d'essai du module : claude plugin test <dossier du plugin>
// Les cas communs sont les mêmes que ceux du secours Python (tests/cas.py).
// Rien n'est exécuté : chaque commande est seulement soumise au garde.
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'
import { CAS } from './cas-communs'

type Cas = [string, string]
type Monde = { regles?: string; branche?: string; moteur?: 'allow' | 'ask' | 'deny' }

/** Ce que le moteur répondrait sous le plugin : son propre verdict, le dossier, les règles et git simulés. */
function monde(on: On, m: Monde = {}): void {
  on('tool.check', () => ({ decision: m.moteur ?? 'allow', reason: 'verdict du moteur' }))
  on('session.cwd', () => ({ value: '/depot' }))
  on('env.get', (_$, e) => ({ value: e.name === 'GARDE_DESTRUCTION_REGLES' ? '/regles.txt' : e.name === 'HOME' ? '/home/essai' : '' }))
  on('fs.read', (_$, e) => (e.path === '/regles.txt' && m.regles !== undefined ? { value: m.regles } : { deny: 'absent' }))
  on('process.run', (_$, e) => ({
    value: { exitCode: 0, stdout: e.argv.includes('rev-parse') ? `${m.branche ?? ''}\n` : '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))
}

const NOMS = { deny: 'refus', ask: 'demande', allow: 'passe' } as const

async function decision($: Engine, outil: string, commande: string): Promise<{ niveau: string; raison: string }> {
  const r = await $.tool.check({ tool: outil, input: { command: commande } })
  return { niveau: NOMS[r.decision], raison: r.reason ?? '' }
}

async function rates($: Engine, voulu: string, cas: Cas[]): Promise<string[]> {
  const res: string[] = []
  for (const [outil, commande] of cas) {
    const { niveau } = await decision($, outil, commande)
    if (niveau !== voulu) res.push(`${outil} ${JSON.stringify(commande)} → ${niveau}`)
  }
  return res
}

test('refuse ce qui détruit trop large ou sans confirmation', { timeoutMs: 60000 }, async ($, on) => {
  monde(on)
  expect(await rates($, 'refus', CAS.refus as Cas[])).toEqual([])
})

test('demande confirmation pour ce qui détruit', { timeoutMs: 60000 }, async ($, on) => {
  monde(on)
  expect(await rates($, 'demande', CAS.demande as Cas[])).toEqual([])
})

test('laisse passer le travail normal', { timeoutMs: 60000 }, async ($, on) => {
  monde(on)
  expect(await rates($, 'passe', CAS.passe as Cas[])).toEqual([])
})

test('les règles personnelles ajoutent des refus et des demandes sans rien retirer', async ($, on) => {
  monde(on, { regles: '# essai\n(psql|mysql).*(DROP|TRUNCATE)\nrefus: dropdb\n(règle invalide\n' })
  expect(await rates($, 'refus', CAS.refusPerso as Cas[])).toEqual([])
  expect(await rates($, 'demande', CAS.demandePerso as Cas[])).toEqual([])
  for (const voulu of ['refus', 'demande', 'passe'] as const) {
    expect(await rates($, voulu, (CAS[voulu] as Cas[]).slice(0, 5))).toEqual([])
  }
})

test('git push --force sans branche nommée : la branche courante décide', async ($, on) => {
  const m: Monde = { branche: 'main' }
  monde(on, m)
  const d = await decision($, 'Bash', 'git push --force')
  expect(d.niveau).toBe('refus')
  expect(d.raison).toContain('main')
  expect((await decision($, 'Bash', 'git push -f origin HEAD')).niveau).toBe('refus')
  expect((await decision($, 'Bash', "ssh hote 'cd /srv/depot && git push --force'")).niveau).toBe('demande')
  expect((await decision($, 'Bash', 'git push')).niveau).toBe('passe')
  m.branche = 'fonctionnalite'
  expect((await decision($, 'Bash', 'git push --force')).niveau).toBe('demande')
  expect((await decision($, 'Bash', 'git push --force origin main')).niveau).toBe('refus')
})

test('les messages sont signés et disent quoi faire', async ($, on) => {
  monde(on)
  const r = await decision($, 'Bash', 'terraform destroy -auto-approve')
  expect(r.raison).toMatch(/^garde-destruction : « terraform destroy »/)
  expect(r.raison).toContain('plan -destroy -out=')
  const d = await decision($, 'Bash', 'gcloud sql instances delete base-prod')
  expect(d.raison).toContain('« gcloud sql instances delete base-prod »')
  expect(d.raison).toContain("À confirmer par l'utilisateur")
  expect((await decision($, 'Bash', 'terraform apply && git reset --hard')).raison).toContain('git reset --hard')
  expect((await decision($, 'Bash', 'terraform apply && rm -rf /')).niveau).toBe('refus')
})

test('le garde durcit le verdict du moteur, il ne l\'adoucit jamais', async ($, on) => {
  const m: Monde = { moteur: 'deny' }
  monde(on, m)
  for (const commande of ['ls -la', 'terraform apply', 'rm -rf /']) {
    const d = await decision($, 'Bash', commande)
    expect(d.niveau).toBe('refus')
    if (commande !== 'rm -rf /') expect(d.raison).toBe('verdict du moteur')
  }
  m.moteur = 'ask'
  expect((await decision($, 'Bash', 'ls -la')).niveau).toBe('demande')
  expect((await decision($, 'Bash', 'rm -rf /')).niveau).toBe('refus')
  expect((await decision($, 'Read', 'terraform destroy -auto-approve')).raison).toBe('verdict du moteur')
})
