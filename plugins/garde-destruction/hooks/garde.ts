// garde-destruction — module de crochets exécuté par Claude Code lui-même (rien à installer).
//
// Examine, AVANT exécution, chaque commande shell : celle qui détruit quelque chose est soumise à la
// confirmation de l'utilisateur ; celle qui détruit trop large, ou en sautant sa propre confirmation,
// est refusée. Même logique et mêmes listes que hooks-handlers/garde.py (secours Python pour les
// versions de Claude Code qui ne chargent pas ce module) : toute règle changée ici l'est aussi là-bas,
// et tests/cas-communs.ts vérifie les deux.
import type { EngineInterface, Register } from 'claude-code'

type Niveau = 'demande' | 'refus'
type Verdict = { niveau: Niveau; raison: string }
type Regle = { niveau: Niveau; motif: RegExp }
type Contexte = { rep: string; regles: Regle[]; powershell: boolean; maison: string | undefined }

const TERRAFORM = new Set(['terraform', 'tofu', 'terragrunt'])
const DOCKER = new Set(['docker', 'podman', 'nerdctl', 'docker-compose'])
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ash', 'ksh'])
// Suppression sous PowerShell (« rm » y est un alias de Remove-Item)
const SUPPRESSION_PS = new Set(['remove-item', 'ri', 'rd', 'del', 'erase', 'rmdir'])
// Commandes examinées
const SURVEILLEES = new Set([...TERRAFORM, ...DOCKER, 'gcloud', 'gsutil', 'bq', 'git', 'rm', 'dd', 'find', 'wipefs'])
// Commandes qui en lancent une autre sur place : la commande lancée est examinée comme si elle était seule
const LANCEURS_LOCAUX = new Set(['sudo', 'doas', 'env', 'timeout', 'nice', 'ionice', 'nohup', 'setsid', 'exec', 'time',
  'command', 'stdbuf', 'xargs', 'watch', 'flock'])
// … ou ailleurs (autre machine, conteneur, autre racine)
const LANCEURS_DISTANTS = new Set(['ssh', 'chroot', 'nsenter', 'kubectl', 'find', ...DOCKER])
const MOTS_CLES = new Set(['then', 'do', 'else', 'elif', 'if', 'while', 'until', '!', '{', '('])
// Branches dont l'historique ne se réécrit pas
const PRINCIPALE = /^(main|master)$/
const GCLOUD_LARGE = new Set(['projects', 'organizations', 'folders'])
const DOSSIER_PERSO = /^(~|\$HOME|\$\{HOME\}|\$env:(USERPROFILE|HOME))(?=\/|$)/i
const VARIABLE = /^\$(\{\w+\}|env:\w+|\w+)/i
// Commandes dont l'entrée « <<EOF » est elle-même une suite de commandes
const INTERPRETE = /(^|[\s;|&(])(sh|bash|zsh|dash|ash|ksh|ssh|sudo|su|chroot|docker|podman|kubectl)(\s|$)/

const demande = (raison: string): Verdict => ({ niveau: 'demande', raison })
const refus = (raison: string): Verdict => ({ niveau: 'refus', raison })

function nomCommande(t: string): string {
  return (t.split('/').pop() ?? '').replace(/\.exe$/i, '')
}

function estSurveillee(nom: string, powershell: boolean): boolean {
  return SURVEILLEES.has(nom) || nom.startsWith('mkfs') || (powershell && SUPPRESSION_PS.has(nom))
}

/** Découpe hors guillemets sur les séparateurs donnés. */
function decouper(cmd: string, seps: string[]): string[] {
  const out: string[] = []
  let cur = '', q: string | undefined, i = 0
  while (i < cmd.length) {
    const c = cmd[i] ?? ''
    if (q !== undefined) {
      cur += c
      if (c === q) q = undefined
      else if (c === '\\' && q === '"' && i + 1 < cmd.length) { cur += cmd[i + 1]; i += 1 }
    } else if (c === "'" || c === '"') {
      q = c; cur += c
    } else {
      const hit = seps.find(s => cmd.startsWith(s, i))
      if (hit !== undefined) { out.push(cur); cur = ''; i += hit.length; continue }
      cur += c
    }
    i += 1
  }
  out.push(cur)
  return out.map(s => s.trim()).filter(s => s !== '')
}

/** Contenu des $( … ) (un niveau). */
function substitutions(cmd: string): string[] {
  const res: string[] = []
  let i = 0
  for (;;) {
    const j = cmd.indexOf('$(', i)
    if (j < 0) return res
    let prof = 1, k = j + 2
    while (k < cmd.length && prof > 0) {
      if (cmd[k] === '(') prof += 1
      else if (cmd[k] === ')') prof -= 1
      k += 1
    }
    res.push(cmd.slice(j + 2, k - 1)); i = k
  }
}

/** Découpage en mots à la manière d'un shell POSIX ; lève une erreur sur un guillemet non fermé. */
function motsShell(s: string): string[] {
  const out: string[] = []
  let cur = '', dans = false, q: string | undefined, i = 0
  while (i < s.length) {
    const c = s[i] ?? ''
    if (q === "'") {
      if (c === "'") q = undefined
      else cur += c
    } else if (q === '"') {
      if (c === '"') q = undefined
      else if (c === '\\' && i + 1 < s.length && '"\\$`\n'.includes(s[i + 1] ?? '')) { cur += s[i + 1]; i += 1 }
      else cur += c
    } else if (c === "'" || c === '"') {
      q = c; dans = true
    } else if (c === '\\' && i + 1 < s.length) {
      cur += s[i + 1]; dans = true; i += 1
    } else if (/\s/.test(c)) {
      if (dans || cur !== '') { out.push(cur); cur = ''; dans = false }
    } else {
      cur += c
    }
    i += 1
  }
  if (q !== undefined) throw new Error('guillemet non fermé')
  if (dans || cur !== '') out.push(cur)
  return out
}

/** Retire le corps des « <<EOF » qui ne sont que du texte (cat > f <<EOF) ; garde ceux qu'un shell exécutera. */
function sansTexteLibre(cmd: string): string {
  const out: string[] = []
  let fin: string | undefined, garde = true
  for (const ligne of cmd.split('\n')) {
    if (fin !== undefined) {
      if (ligne.trim() === fin) fin = undefined
      else if (garde) out.push(ligne)
      continue
    }
    const m = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/.exec(ligne)
    if (m === null) { out.push(ligne); continue }
    fin = m[2]
    garde = INTERPRETE.test(ligne.slice(0, m.index))
    out.push(ligne.slice(0, m.index))
  }
  return out.join('\n')
}

/** Les mots d'une commande simple, sans redirections, parenthèses de sous-shell ni accents graves. */
function mots(etape: string): string[] {
  let toks: string[]
  try {
    toks = motsShell(etape)
  } catch {
    toks = etape.split(/\s+/)
  }
  const out: string[] = []
  let saute = false
  for (const brut of toks) {
    if (saute) { saute = false; continue }
    if (/^[0-9&]*(>>?|<)&?$/.test(brut)) { saute = true; continue } // « > f », « 2> f », « < f »
    if (/^[0-9&]*[<>]/.test(brut)) continue // « 2>/dev/null », « >f », « 2>&1 »
    let t = brut.replace(/^[`(]+|`+$/g, '')
    while (t.endsWith(')') && t.split(')').length > t.split('(').length) t = t.slice(0, -1)
    if (t !== '') out.push(t)
  }
  return out
}

function joindre(rep: string, p: string, maison: string | undefined): string {
  let abs = p
  if (p === '~' || p.startsWith('~/')) abs = (maison ?? '') + p.slice(1)
  else if (!(p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p))) abs = `${rep}/${p}`
  const parts: string[] = []
  for (const seg of abs.replace(/\\/g, '/').split('/')) {
    if (seg === '..') { if (parts.length > 1) parts.pop() }
    else if (seg !== '.' && (seg !== '' || parts.length === 0)) parts.push(seg)
  }
  return parts.join('/') || '/'
}

/**
 * Ce que vaut la suppression récursive d'un chemin : refus pour la racine, un dossier système ou le
 * dossier personnel entiers ; demande pour un dossier large ; undefined pour un sous-dossier ordinaire.
 */
function largeur(brut: string): Niveau | undefined {
  let p = brut.replace(/\\/g, '/').replace(/^[A-Za-z]:(?=\/|$)/, '')
  if (p === '' && brut !== '') p = '/' // « C: »
  let origine: 'racine' | 'perso' | 'variable' | 'relatif' = 'relatif'
  const perso = DOSSIER_PERSO.exec(p), variable = VARIABLE.exec(p)
  if (perso !== null) { origine = 'perso'; p = p.slice(perso[0].length) }
  else if (p.startsWith('/')) origine = 'racine'
  else if (variable !== null) {
    if (p === variable[0]) return undefined // « $DOSSIER » seul : vide, il ne supprime rien
    origine = 'variable'; p = p.slice(variable[0].length)
  }
  const segs = p.split('/').filter(s => s !== '' && s !== '.')
  while (segs.length > 0 && /^\.?\*+$/.test(segs[segs.length - 1] ?? '')) segs.pop() // « x/* » vaut « x »
  const n = segs.length
  if (origine === 'racine') {
    if (n === 0) return 'refus'
    const temporaire = segs[0] === 'tmp' || (segs[0] === 'var' && segs[1] === 'tmp')
    if (temporaire) return n === 1 && segs[0] === 'tmp' ? 'demande' : n === 2 && segs[0] === 'var' ? 'demande' : undefined
    return n === 1 ? 'refus' : n === 2 ? 'demande' : undefined
  }
  if (origine === 'perso') return n === 0 ? 'refus' : n === 1 ? 'demande' : undefined
  if (origine === 'variable') return n <= 1 ? 'demande' : undefined // variable vide : « $D/x » devient « /x »
  if (n === 0 || segs.every(s => s === '..')) return 'demande' // « . », « * », « .. »
  return n === 1 && segs[0] === '.git' ? 'demande' : undefined
}

function controleRm(mot: string, args: string[], powershell: boolean): Verdict | undefined {
  const fin = args.indexOf('--')
  const avant = fin < 0 ? args : args.slice(0, fin)
  const opts = avant.filter(a => a.startsWith('-'))
  const cibles = avant.filter(a => !a.startsWith('-')).concat(fin < 0 ? [] : args.slice(fin + 1))
  if (opts.includes('--no-preserve-root')) return refus(`« ${mot} --no-preserve-root » supprime la racine du système`)
  const recursif = powershell
    ? opts.some(o => /^-r(ec(urse)?)?$/i.test(o) || /^-[a-z]*r[a-z]*$/.test(o))
    : opts.some(o => o === '--recursive' || /^-[A-Za-z]*[rR][A-Za-z]*$/.test(o))
  if (!recursif) return undefined
  const graves = cibles.filter(c => largeur(c) === 'refus'), larges = cibles.filter(c => largeur(c) === 'demande')
  if (graves.length > 0) return refus(`« ${mot} » récursif sur ${graves.slice(0, 3).join(', ')} supprime un dossier système ou personnel entier`)
  if (larges.length > 0) return demande(`« ${mot} » récursif sur ${larges.slice(0, 3).join(', ')} supprime un dossier large`)
  return undefined
}

function controleFind(args: string[]): Verdict | undefined {
  if (!args.includes('-delete')) return undefined
  const premier = args.findIndex(a => a.startsWith('-') || a === '(' || a === '!')
  const racines = args.slice(0, premier < 0 ? args.length : premier)
  const larges = racines.filter(r => /^[/~$]/.test(r) && largeur(r) !== undefined)
  return larges.length > 0 ? demande(`« find … -delete » supprime tout ce qu'il trouve sous ${larges.slice(0, 3).join(', ')}`) : undefined
}

function controleDisque(mot: string, args: string[]): Verdict | undefined {
  if (mot === 'dd') {
    const cible = args.find(a => /^of=\/dev\/(?!null$|zero$|stdout$|stderr$|fd\/|tty|shm\/)/.test(a))
    return cible === undefined ? undefined : demande(`« dd ${cible} » écrase le contenu de ce périphérique`)
  }
  if (mot.startsWith('mkfs')) return demande(`« ${mot} » formate le périphérique : tout son contenu est perdu`)
  if (mot === 'wipefs' && args.some(a => a === '--all' || /^-[a-z]*a[a-z]*$/.test(a))) {
    return demande('« wipefs -a » efface les signatures du disque : son contenu devient illisible')
  }
  return undefined
}

function controleTerraform(mot: string, args: string[], toks: string[]): Verdict | undefined {
  const pos = args.filter(a => !a.startsWith('-') && a !== 'run-all' && a !== 'run')
  const opts = new Map<string, string | undefined>()
  for (const a of args.filter(x => x.startsWith('-'))) {
    const [nom, valeur] = a.replace(/^-+/, '').split('=', 2)
    opts.set(nom ?? '', valeur)
  }
  const sub = pos[0], reste = pos.slice(1)
  if (sub === undefined) return undefined
  const oui = (n: string) => opts.has(n) && opts.get(n) !== 'false'
  const sansDialogue = oui('auto-approve') || oui('terragrunt-non-interactive') || oui('non-interactive') ||
    toks.some(t => /^TF_CLI_ARGS\w*=.*auto-approve/.test(t))
  if (sub === 'destroy' || sub === 'destroy-all' || (sub === 'apply' && oui('destroy'))) {
    const cmd = sub === 'apply' ? `${mot} apply -destroy` : `${mot} ${sub}`
    return sansDialogue
      ? refus(`« ${cmd} » sans dialogue (-auto-approve) détruit l'infrastructure sans aucune confirmation. ` +
        `La voie permise : enregistrer un plan (« ${mot} plan -destroy -out=… »), puis l'appliquer, ce qui sera soumis à confirmation`)
      : demande(`« ${cmd} » détruit les ressources gérées par cette configuration`)
  }
  if (sub === 'apply') {
    return demande(`« ${mot} apply » peut détruire ou remplacer des ressources` + (sansDialogue ? ' (-auto-approve : Terraform ne demandera rien)' : ''))
  }
  if (sub === 'state' && reste[0] === 'rm') return demande(`« ${mot} state rm » retire des ressources de l'état : elles ne seront plus gérées`)
  if (sub === 'state' && reste[0] === 'push') return demande(`« ${mot} state push » écrase l'état distant`)
  if (sub === 'force-unlock') return demande(`« ${mot} force-unlock » lève le verrou de l'état, au risque de le corrompre s'il sert ailleurs`)
  if (sub === 'workspace' && reste[0] === 'delete') return demande(`« ${mot} workspace delete » supprime un espace de travail et son état`)
  if (sub === 'taint') return demande(`« ${mot} taint » marque une ressource pour être détruite et recréée au prochain apply`)
  return undefined
}

function controleGcloud(args: string[], toks: string[]): Verdict | undefined {
  const pos = args.filter(a => !a.startsWith('-')).slice(0, 8)
  const silencieux = args.some(a => a === '--quiet' || a === '-q') || toks.some(t => /^CLOUDSDK_CORE_DISABLE_PROMPTS=(1|true)$/i.test(t))
  const iv = pos.findIndex((a, i) => a === 'delete' || a === 'destroy' || (a === 'rm' && pos[i - 1] === 'storage'))
  if (iv >= 0) {
    const cmd = `gcloud ${pos.slice(0, iv + 2).join(' ')}`
    if (pos.slice(0, iv).some(a => GCLOUD_LARGE.has(a))) return refus(`« ${cmd} » supprime un projet, un dossier ou une organisation entière`)
    if (silencieux) return refus(`« ${cmd} » avec --quiet supprime sans aucune confirmation`)
    return demande(`« ${cmd} » supprime des ressources Google Cloud`)
  }
  if (pos.includes('remove-iam-policy-binding')) return demande("« gcloud … remove-iam-policy-binding » retire des droits d'accès")
  if (pos.includes('rsync') && args.includes('--delete-unmatched-destination-objects')) {
    return demande('« gcloud storage rsync » avec --delete-unmatched-destination-objects supprime ce qui manque à la source')
  }
  return undefined
}

function controleGsutil(mot: string, args: string[]): Verdict | undefined {
  const pos = args.filter(a => !a.startsWith('-')).slice(0, 3)
  if (mot === 'bq') {
    if (!pos.includes('rm')) return undefined
    const force = args.some(a => a === '--force' || /^-[a-z]*f[a-z]*$/.test(a))
    return force ? refus('« bq rm -f » supprime sans aucune confirmation') : demande('« bq rm » supprime un jeu de données ou une table BigQuery')
  }
  if (pos.includes('rm')) return demande('« gsutil rm » supprime des objets du stockage, sans corbeille')
  if (pos.includes('rb')) return demande('« gsutil rb » supprime un seau de stockage')
  if (pos.includes('rsync') && args.some(a => /^-[a-zA-Z]*d[a-zA-Z]*$/.test(a))) return demande('« gsutil rsync -d » supprime ce qui manque à la source')
  return undefined
}

function controleDocker(mot: string, args: string[]): Verdict | undefined {
  const pos = args.filter(a => !a.startsWith('-')), opts = args.filter(a => a.startsWith('-'))
  const suite = (a: string, b: string[]) => pos.some((p, i) => p === a && b.includes(pos[i + 1] ?? ''))
  const drapeau = (court: string, long: string) => opts.some(o => o === long || (!o.startsWith('--') && o.includes(court)))
  if (suite('system', ['prune'])) {
    return demande(`« ${mot} system prune » supprime conteneurs arrêtés, réseaux et images inutilisés` + (opts.includes('--volumes') ? ', volumes compris' : ''))
  }
  if (suite('volume', ['rm', 'remove', 'prune'])) return demande(`« ${mot} volume rm/prune » supprime des volumes, donc leurs données`)
  if (suite('container', ['prune'])) return demande(`« ${mot} container prune » supprime tous les conteneurs arrêtés`)
  if (suite('image', ['prune']) && drapeau('a', '--all')) return demande(`« ${mot} image prune -a » supprime toutes les images non utilisées`)
  if ((mot === 'docker-compose' || pos.includes('compose')) && pos.includes('down') && drapeau('v', '--volumes')) {
    return demande('« compose down -v » supprime aussi les volumes de la pile, donc ses données')
  }
  return undefined
}

async function git($: EngineInterface, rep: string, args: string[]): Promise<string> {
  try {
    const r = await $.process.run(['git', '-C', rep, ...args], { timeoutMs: 8000 })
    return r.exitCode === 0 ? r.stdout : ''
  } catch {
    return ''
  }
}

async function controleGit($: EngineInterface, ctx: Contexte, args: string[], ici: boolean): Promise<Verdict | undefined> {
  let rep = ctx.rep, i = 0
  while (i < args.length && (args[i] ?? '').startsWith('-')) {
    if (args[i] === '-C' && i + 1 < args.length) { rep = joindre(rep, args[i + 1] ?? '', ctx.maison); i += 2; continue }
    i += args[i] === '-c' ? 2 : 1
  }
  if (i >= args.length) return undefined
  const sub = args[i] ?? '', reste = args.slice(i + 1)
  const opts = reste.filter(a => a.startsWith('-')), pos = reste.filter(a => !a.startsWith('-'))
  const court = (c: string) => opts.some(o => !o.startsWith('--') && o.includes(c))
  if (sub === 'push') {
    const refs = pos.slice(1)
    const force = court('f') || opts.some(o => o === '--force' || o.startsWith('--force-with-lease') || o === '--mirror') || refs.some(r => r.startsWith('+'))
    const supprime = court('d') || opts.includes('--delete') || opts.includes('--prune') || refs.some(r => r.startsWith(':'))
    if (!force && !supprime) return undefined
    const cibles = refs.map(r => (r.replace(/^\+/, '').split(':').pop() ?? '').replace(/^refs\/heads\//, ''))
    if ((cibles.length === 0 || cibles.includes('HEAD')) && ici) {
      const courante = (await git($, rep, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim()
      if (courante !== '') cibles.push(courante)
    }
    const principale = cibles.find(c => PRINCIPALE.test(c))
    if (principale !== undefined) {
      return refus(force ? `« git push --force » sur ${principale} réécrit l'historique de la branche principale`
        : `« git push --delete » supprimerait la branche principale ${principale}`)
    }
    return demande(force ? "« git push --force » réécrit l'historique distant : les commits écrasés sont perdus"
      : '« git push --delete » supprime une branche ou une étiquette du dépôt distant')
  }
  if (sub === 'reset' && opts.includes('--hard')) return demande('« git reset --hard » efface les modifications non commitées')
  if (sub === 'clean' && (court('f') || opts.includes('--force')) && !(court('n') || opts.includes('--dry-run'))) {
    return demande('« git clean -f » supprime définitivement les fichiers non suivis')
  }
  if (sub === 'branch' && (court('D') || ((court('d') || opts.includes('--delete')) && (court('f') || opts.includes('--force'))))) {
    return demande('« git branch -D » supprime une branche même non fusionnée')
  }
  if (sub === 'stash' && pos[0] === 'clear') return demande('« git stash clear » supprime toutes les remises')
  return undefined
}

async function controle($: EngineInterface, ctx: Contexte, mot: string, args: string[], toks: string[], ici: boolean): Promise<Verdict | undefined> {
  if (TERRAFORM.has(mot)) return controleTerraform(mot, args, toks)
  if (mot === 'gcloud') return controleGcloud(args, toks)
  if (mot === 'gsutil' || mot === 'bq') return controleGsutil(mot, args)
  if (mot === 'git') return controleGit($, ctx, args, ici)
  if (mot === 'rm' || (ctx.powershell && SUPPRESSION_PS.has(mot))) return controleRm(mot, args, ctx.powershell)
  if (mot === 'find') return controleFind(args)
  if (DOCKER.has(mot)) return controleDocker(mot, args)
  return controleDisque(mot, args)
}

/** Tout ce que la commande détruirait. */
async function analyser($: EngineInterface, ctx: Contexte, brut: string, profondeur = 0, local = true): Promise<Verdict[]> {
  if (profondeur > 4) return []
  const res: Verdict[] = []
  const cmd = sansTexteLibre(brut)
  for (const sub of substitutions(cmd)) res.push(...await analyser($, ctx, sub, profondeur + 1, local))
  const sansSub = cmd.replace(/\$\((?:[^()]|\([^()]*\))*\)/g, 'SUBST')
  for (const seg of decouper(sansSub, ['&&', '||', ';', '\n'])) {
    for (const etape of decouper(seg, ['|', '&'])) {
      const toks = mots(etape)
      const i = toks.findIndex(t => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(t) && !MOTS_CLES.has(t))
      if (i < 0) continue
      const nom = (t: string) => (ctx.powershell ? nomCommande(t).toLowerCase() : nomCommande(t))
      const mot0 = nom(toks[i] ?? ''), args0 = toks.slice(i + 1)
      const surPlace = local && !LANCEURS_DISTANTS.has(mot0)
      if (mot0 === 'cd' && args0.length > 0 && local) ctx.rep = joindre(ctx.rep, args0[0] ?? '', ctx.maison)
      for (const regle of ctx.regles) {
        if (regle.motif.test(toks.slice(i).join(' '))) res.push({ niveau: regle.niveau, raison: `règle personnelle « ${regle.motif.source} »` })
      }
      // Chaînes qu'un autre shell exécutera : ssh '…', sh -c '…', eval '…'.
      if (mot0 === 'ssh') {
        for (const d of args0.filter(a => /[\s;|&]/.test(a)).slice(-1)) res.push(...await analyser($, ctx, d, profondeur + 1, false))
      }
      if (mot0 === 'eval') res.push(...await analyser($, ctx, args0.join(' '), profondeur + 1, local))
      if (mot0 !== 'git') {
        for (let k = 0; k + 1 < args0.length; k += 1) {
          const avant = k === 0 ? mot0 : nom(args0[k - 1] ?? '')
          if (args0[k] === '-c' || (SHELLS.has(avant) && /^-[a-z]{1,3}c$/.test(args0[k] ?? ''))) {
            res.push(...await analyser($, ctx, args0[k + 1] ?? '', profondeur + 1, surPlace))
          }
        }
      }
      // La commande elle-même, puis celles qu'elle lance (sudo rm…, docker exec … rm…, ssh hôte rm…).
      const candidats = [i]
      if (LANCEURS_LOCAUX.has(mot0) || LANCEURS_DISTANTS.has(mot0)) {
        for (let k = i + 1; k < toks.length; k += 1) {
          const t = toks[k] ?? ''
          if (estSurveillee(t.startsWith('/') ? nom(t) : ctx.powershell ? t.toLowerCase() : t, ctx.powershell)) candidats.push(k)
        }
      }
      for (const k of candidats) {
        const v = await controle($, ctx, nom(toks[k] ?? ''), toks.slice(k + 1), toks, k === i ? local : surPlace)
        if (v !== undefined) res.push(v)
      }
    }
  }
  return res
}

/** Le dossier personnel, ou undefined ; une variable illisible ne doit pas désarmer le garde. */
async function dossierPerso($: EngineInterface): Promise<string | undefined> {
  try {
    return (await $.env.get('HOME')) || (await $.env.get('USERPROFILE')) || undefined
  } catch {
    return undefined
  }
}

/**
 * Règles personnelles : une expression régulière par ligne, précédée au besoin de « refus: » ou de
 * « demande: » (par défaut). Elles s'ajoutent à la liste, sans rien en retirer.
 */
async function reglesPerso($: EngineInterface, maison: string | undefined): Promise<Regle[]> {
  let texte: string
  try {
    const chemin = (await $.env.get('GARDE_DESTRUCTION_REGLES')) || (maison === undefined ? undefined : `${maison}/.config/garde-destruction/regles.txt`)
    if (chemin === undefined) return []
    texte = String(await $.fs.read(chemin))
  } catch {
    return []
  }
  const res: Regle[] = []
  for (const brut of texte.split('\n')) {
    const ligne = brut.trim()
    if (ligne === '' || ligne.startsWith('#')) continue
    const m = /^(refus|demande)\s*:\s*(.+)$/.exec(ligne)
    try {
      res.push({ niveau: m?.[1] === 'refus' ? 'refus' : 'demande', motif: new RegExp(m?.[2] ?? ligne) })
    } catch {
      // règle invalide : ignorée
    }
  }
  return res
}

/** Ce que le garde pense d'une commande : refus, demande de confirmation, ou undefined. */
async function decider($: EngineInterface, outil: string, commande: string): Promise<Verdict | undefined> {
  const powershell = outil === 'PowerShell'
  const cmd = powershell ? commande.replace(/\\/g, '/') : commande
  const maison = await dossierPerso($)
  const regles = await reglesPerso($, maison)
  let verdicts: Verdict[]
  try {
    let rep = '.'
    try {
      rep = await $.session.cwd()
    } catch {
      // dossier inconnu : les contrôles git se feront depuis le dossier courant
    }
    verdicts = await analyser($, { rep, regles, powershell, maison }, cmd)
  } catch {
    // En cas de doute (analyse impossible) : confirmation si une commande surveillée côtoie un verbe de destruction.
    const tous = cmd.match(/[^\s'";|&()<>]+/g) ?? []
    const douteux = tous.some(m => estSurveillee(nomCommande(m), powershell)) &&
      tous.some(m => /^(destroy|delete|rm|prune|-[a-zA-Z]*[rf][a-zA-Z]*|--force|--hard)$/.test(m))
    verdicts = douteux ? [demande('commande non analysable qui semble destructrice')] : []
  }
  const grave = verdicts.find(v => v.niveau === 'refus')
  if (grave !== undefined) return grave
  if (verdicts.length === 0) return undefined
  const raisons = [...new Set(verdicts.map(v => v.raison))]
  return demande(raisons.slice(0, 3).join(' ; ') + (raisons.length > 3 ? ` ; … (${raisons.length - 3} autres)` : ''))
}

function texteRefus(raison: string): string {
  return 'garde-destruction : ' + raison + '. Commande refusée : elle détruit trop large, ou sans confirmation possible. ' +
    "Ne contourne pas ce refus : dis à l'utilisateur ce qui a été refusé. S'il veut vraiment cette opération, " +
    "c'est à lui de la lancer dans son terminal, ou de désactiver le plugin garde-destruction."
}

function texteDemande(raison: string): string {
  return 'garde-destruction : ' + raison + ". À confirmer par l'utilisateur."
}

export const register: Register = on => {
  // Le verdict du moteur d'abord : le garde ne fait que durcir (autorisé → demande ou refus), jamais l'inverse.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    if ((e.tool !== 'Bash' && e.tool !== 'PowerShell') || verdict.decision === 'deny') return verdict
    const commande = (e.input as { command?: unknown } | null)?.command
    if (typeof commande !== 'string') return verdict
    const v = await decider($, e.tool, commande)
    if (v === undefined) return verdict
    return v.niveau === 'refus' ? { decision: 'deny', reason: texteRefus(v.raison) } : { decision: 'ask', reason: texteDemande(v.raison) }
  })
}
