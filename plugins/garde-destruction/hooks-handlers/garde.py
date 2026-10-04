#!/usr/bin/env python3
"""garde-destruction — hook PreToolUse de Claude Code (secours Python).

Même logique et mêmes listes que hooks/garde.ts, le module que Claude Code exécute lui-même.
Ce script sert aux versions de Claude Code qui ne chargent pas ce module ; toute règle changée
ici l'est aussi là-bas, et tests/cas-communs.ts vérifie les deux.

Examine, AVANT exécution, chaque commande shell :
  - celle qui détruit quelque chose est soumise à la confirmation de l'utilisateur
    (`terraform destroy`, `terraform apply`, `gcloud … delete`, `git reset --hard`, `docker volume rm`,
    `kubectl delete`, `helm uninstall`, `aws s3 rm`, `rclone purge`, `restic forget`, `curl -X DELETE`,
    `zfs destroy`, `lvremove`…) ;
  - celle qui détruit trop large, ou en sautant sa propre confirmation, est refusée
    (`terraform destroy -auto-approve`, `gcloud … delete --quiet`, `gcloud projects delete`,
    `rm -rf /`, `git push --force` sur la branche principale, `kubectl delete ns --all`, `az group delete`…).
Les commandes sont aussi examinées dans `ssh … '…'`, `sh -c '…'`, `sudo …`, `docker exec …`.

Pas de contournement prévu : pour l'arrêter, l'utilisateur désactive le plugin
(`claude plugin disable garde-destruction@<source>`, la source est donnée par `claude plugin list`).

Règles personnelles : une expression régulière par ligne dans ~/.config/garde-destruction/regles.txt
(ou le fichier désigné par GARDE_DESTRUCTION_REGLES), précédée au besoin de « refus: » ou de
« demande: » (par défaut). Elles s'ajoutent à la liste, elles n'en retirent rien.
"""
import json, os, re, shlex, subprocess, sys

TERRAFORM = {"terraform", "tofu", "terragrunt"}
DOCKER = {"docker", "podman", "nerdctl", "docker-compose"}
SHELLS = {"sh", "bash", "zsh", "dash", "ash", "ksh"}
# Suppression sous PowerShell (« rm » y est un alias de Remove-Item)
SUPPRESSION_PS = {"remove-item", "ri", "rd", "del", "erase", "rmdir"}
# Commandes examinées
# Kubernetes, stockage objet, sauvegarde, API web, volumes ZFS / LVM
NUAGE = {"kubectl", "helm", "flux", "aws", "az", "rclone", "mc", "s3cmd", "restic"}
HTTP = {"curl", "wget", "http", "https", "xh", "xhs"}
VOLUMES = {"zfs", "zpool", "lvremove", "vgremove", "pvremove"}
SURVEILLEES = TERRAFORM | DOCKER | NUAGE | HTTP | VOLUMES | {"gcloud", "gsutil", "bq", "git", "rm", "dd", "find", "wipefs"}
# Commandes qui en lancent une autre sur place : la commande lancée est examinée comme si elle était seule
LANCEURS_LOCAUX = {"sudo", "doas", "env", "timeout", "nice", "ionice", "nohup", "setsid", "exec", "time",
                   "command", "stdbuf", "xargs", "watch", "flock"}
# … ou ailleurs (autre machine, conteneur, autre racine)
LANCEURS_DISTANTS = {"ssh", "chroot", "nsenter", "kubectl", "find"} | DOCKER
MOTS_CLES = {"then", "do", "else", "elif", "if", "while", "until", "!", "{", "("}
# Branches dont l'historique ne se réécrit pas
PRINCIPALE = re.compile(r"^(main|master)$")
GCLOUD_LARGE = {"projects", "organizations", "folders"}
# Options qui prennent une valeur (« -n prod ») : la valeur n'est pas le nom d'une sous-commande
AVEC_VALEUR = {"-n", "--namespace", "--context", "--kube-context", "--kubeconfig", "--cluster", "--user", "-s", "--server",
               "--as", "--as-group", "--token", "--request-timeout", "-l", "--selector", "-f", "--filename", "-o", "--output",
               "--field-selector", "--grace-period", "--timeout", "-c", "--container", "-k", "--kustomize",
               "--profile", "--region", "--endpoint-url", "--query", "--color", "--subscription", "-g", "--resource-group", "--name",
               "-r", "--repo", "--repository-file", "-p", "--password-file", "--password-command", "--cache-dir",
               "--config", "--include", "--exclude", "--filter", "--min-age", "--max-age", "--log-file", "--log-level",
               "-a", "--auth", "--session"}
# Kubernetes : types dont la suppression emporte des données ou tout un pan du cluster
K_ESPACES = {"ns", "namespace", "namespaces"}
K_VOLUMES = {"pv", "pvc", "persistentvolume", "persistentvolumes", "persistentvolumeclaim", "persistentvolumeclaims"}
K_DEFINITIONS = {"crd", "crds", "customresourcedefinition", "customresourcedefinitions"}
DOSSIER_PERSO = re.compile(r"(?i)^(~|\$HOME|\$\{HOME\}|\$env:(USERPROFILE|HOME))(?=/|$)")
VARIABLE = re.compile(r"(?i)^\$(\{\w+\}|env:\w+|\w+)")
# Commandes dont l'entrée « <<EOF » est elle-même une suite de commandes
INTERPRETE = re.compile(r"(^|[\s;|&(])(sh|bash|zsh|dash|ash|ksh|ssh|sudo|su|chroot|docker|podman|kubectl)(\s|$)")
HEREDOC = re.compile(r"<<-?\s*(['\"]?)([A-Za-z_][A-Za-z0-9_]*)\1")
AFFECTATION = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")

REP = [os.getcwd()]  # dossier courant de la commande analysée (suit les « cd »)
POWERSHELL = [False]


def demande(raison): return ("demande", raison)
def refus(raison): return ("refus", raison)


def regles_perso():
    chemin = os.environ.get("GARDE_DESTRUCTION_REGLES") or os.path.join(
        os.path.expanduser("~"), ".config", "garde-destruction", "regles.txt")
    res = []
    try:
        with open(chemin, encoding="utf-8") as f:
            for ligne in f:
                ligne = ligne.strip()
                if not ligne or ligne.startswith("#"): continue
                m = re.match(r"^(refus|demande)\s*:\s*(.+)$", ligne)
                try:
                    res.append(("refus" if m and m.group(1) == "refus" else "demande", re.compile(m.group(2) if m else ligne)))
                except re.error:
                    pass  # règle invalide : ignorée
    except OSError:
        pass
    return res


REGLES = regles_perso()


def nom_commande(t):
    return re.sub(r"(?i)\.exe$", "", t.rsplit("/", 1)[-1])


def nom(t):
    return nom_commande(t).lower() if POWERSHELL[0] else nom_commande(t)


def est_surveillee(n):
    return n in SURVEILLEES or n.startswith("mkfs") or (POWERSHELL[0] and n in SUPPRESSION_PS)


def decouper(cmd, seps):
    """Découpe hors guillemets sur les séparateurs donnés."""
    out, cur, q, i = [], "", None, 0
    while i < len(cmd):
        c = cmd[i]
        if q:
            cur += c
            if c == q: q = None
            elif c == "\\" and q == '"' and i + 1 < len(cmd): cur += cmd[i + 1]; i += 1
        elif c in "'\"":
            q = c; cur += c
        else:
            hit = next((s for s in seps if cmd.startswith(s, i)), None)
            if hit:
                out.append(cur); cur = ""; i += len(hit); continue
            cur += c
        i += 1
    out.append(cur)
    return [s.strip() for s in out if s.strip()]


def substitutions(cmd):
    """Contenu des $( … ) (un niveau)."""
    res, i = [], 0
    while True:
        j = cmd.find("$(", i)
        if j < 0: return res
        prof, k = 1, j + 2
        while k < len(cmd) and prof:
            prof += {"(": 1, ")": -1}.get(cmd[k], 0); k += 1
        res.append(cmd[j + 2:k - 1]); i = k


def sans_texte_libre(cmd):
    """Retire le corps des « <<EOF » qui ne sont que du texte (cat > f <<EOF) ; garde ceux qu'un shell exécutera."""
    out, fin, garde = [], None, True
    for ligne in cmd.split("\n"):
        if fin is not None:
            if ligne.strip() == fin: fin = None
            elif garde: out.append(ligne)
            continue
        m = HEREDOC.search(ligne)
        if not m:
            out.append(ligne); continue
        fin = m.group(2)
        garde = bool(INTERPRETE.search(ligne[:m.start()]))
        out.append(ligne[:m.start()])
    return "\n".join(out)


def mots(etape):
    """Les mots d'une commande simple, sans redirections, parenthèses de sous-shell ni accents graves."""
    try:
        toks = shlex.split(etape, comments=False)
    except ValueError:
        toks = etape.split()
    out, saute = [], False
    for brut in toks:
        if saute:
            saute = False; continue
        if re.match(r"^[0-9&]*(>>?|<)&?$", brut):  # « > f », « 2> f », « < f »
            saute = True; continue
        if re.match(r"^[0-9&]*[<>]", brut): continue  # « 2>/dev/null », « >f », « 2>&1 »
        t = re.sub(r"^[`(]+|`+$", "", brut)
        while t.endswith(")") and t.count(")") > t.count("("): t = t[:-1]
        if t: out.append(t)
    return out


def largeur(brut):
    """Ce que vaut la suppression récursive d'un chemin : « refus » pour la racine, un dossier système ou le
    dossier personnel entiers ; « demande » pour un dossier large ; None pour un sous-dossier ordinaire."""
    p = re.sub(r"^[A-Za-z]:(?=/|$)", "", brut.replace("\\", "/"))
    if p == "" and brut != "": p = "/"  # « C: »
    origine = "relatif"
    perso, variable = DOSSIER_PERSO.match(p), VARIABLE.match(p)
    if perso:
        origine = "perso"; p = p[perso.end():]
    elif p.startswith("/"):
        origine = "racine"
    elif variable:
        if p == variable.group(0): return None  # « $DOSSIER » seul : vide, il ne supprime rien
        origine = "variable"; p = p[variable.end():]
    segs = [s for s in p.split("/") if s not in ("", ".")]
    while segs and re.match(r"^\.?\*+$", segs[-1]): segs.pop()  # « x/* » vaut « x »
    n = len(segs)
    if origine == "racine":
        if n == 0: return "refus"
        if segs[0] == "tmp": return "demande" if n == 1 else None
        if segs[:2] == ["var", "tmp"]: return "demande" if n == 2 else None
        return "refus" if n == 1 else "demande" if n == 2 else None
    if origine == "perso": return "refus" if n == 0 else "demande" if n == 1 else None
    if origine == "variable": return "demande" if n <= 1 else None  # variable vide : « $D/x » devient « /x »
    if n == 0 or all(s == ".." for s in segs): return "demande"  # « . », « * », « .. »
    return "demande" if segs == [".git"] else None


def controle_rm(mot, args):
    fin = args.index("--") if "--" in args else -1
    avant = args if fin < 0 else args[:fin]
    opts = [a for a in avant if a.startswith("-")]
    cibles = [a for a in avant if not a.startswith("-")] + ([] if fin < 0 else args[fin + 1:])
    if "--no-preserve-root" in opts: return refus("« %s --no-preserve-root » supprime la racine du système" % mot)
    if POWERSHELL[0]:
        recursif = any(re.match(r"(?i)^-r(ec(urse)?)?$", o) or re.match(r"^-[a-z]*r[a-z]*$", o) for o in opts)
    else:
        recursif = any(o == "--recursive" or re.match(r"^-[A-Za-z]*[rR][A-Za-z]*$", o) for o in opts)
    if not recursif: return None
    graves = [c for c in cibles if largeur(c) == "refus"]
    larges = [c for c in cibles if largeur(c) == "demande"]
    if graves: return refus("« %s » récursif sur %s supprime un dossier système ou personnel entier" % (mot, ", ".join(graves[:3])))
    if larges: return demande("« %s » récursif sur %s supprime un dossier large" % (mot, ", ".join(larges[:3])))
    return None


def controle_find(args):
    if "-delete" not in args: return None
    premier = next((k for k, a in enumerate(args) if a.startswith("-") or a in ("(", "!")), len(args))
    larges = [r for r in args[:premier] if re.match(r"^[/~$]", r) and largeur(r) is not None]
    if larges: return demande("« find … -delete » supprime tout ce qu'il trouve sous %s" % ", ".join(larges[:3]))
    return None


def controle_disque(mot, args):
    if mot == "dd":
        cible = next((a for a in args if re.match(r"^of=/dev/(?!null$|zero$|stdout$|stderr$|fd/|tty|shm/)", a)), None)
        return demande("« dd %s » écrase le contenu de ce périphérique" % cible) if cible else None
    if mot.startswith("mkfs"): return demande("« %s » formate le périphérique : tout son contenu est perdu" % mot)
    if mot == "wipefs" and any(a == "--all" or re.match(r"^-[a-z]*a[a-z]*$", a) for a in args):
        return demande("« wipefs -a » efface les signatures du disque : son contenu devient illisible")
    return None


def controle_terraform(mot, args, toks):
    pos = [a for a in args if not a.startswith("-") and a not in ("run-all", "run")]
    opts = {}
    for a in args:
        if a.startswith("-"):
            morceaux = a.lstrip("-").split("=", 1)
            opts[morceaux[0]] = morceaux[1] if len(morceaux) > 1 else None
    if not pos: return None
    sub, reste = pos[0], pos[1:]
    oui = lambda n: n in opts and opts[n] != "false"
    sans_dialogue = (oui("auto-approve") or oui("terragrunt-non-interactive") or oui("non-interactive")
                     or any(re.match(r"^TF_CLI_ARGS\w*=.*auto-approve", t) for t in toks))
    if sub in ("destroy", "destroy-all") or (sub == "apply" and oui("destroy")):
        cmd = "%s apply -destroy" % mot if sub == "apply" else "%s %s" % (mot, sub)
        if sans_dialogue:
            return refus("« %s » sans dialogue (-auto-approve) détruit l'infrastructure sans aucune confirmation. "
                         "La voie permise : enregistrer un plan (« %s plan -destroy -out=… »), puis l'appliquer, "
                         "ce qui sera soumis à confirmation" % (cmd, mot))
        return demande("« %s » détruit les ressources gérées par cette configuration" % cmd)
    if sub == "apply":
        return demande("« %s apply » peut détruire ou remplacer des ressources" % mot
                       + (" (-auto-approve : Terraform ne demandera rien)" if sans_dialogue else ""))
    if sub == "state" and reste[:1] == ["rm"]:
        return demande("« %s state rm » retire des ressources de l'état : elles ne seront plus gérées" % mot)
    if sub == "state" and reste[:1] == ["push"]: return demande("« %s state push » écrase l'état distant" % mot)
    if sub == "force-unlock":
        return demande("« %s force-unlock » lève le verrou de l'état, au risque de le corrompre s'il sert ailleurs" % mot)
    if sub == "workspace" and reste[:1] == ["delete"]:
        return demande("« %s workspace delete » supprime un espace de travail et son état" % mot)
    if sub == "taint":
        return demande("« %s taint » marque une ressource pour être détruite et recréée au prochain apply" % mot)
    return None


def controle_gcloud(args, toks):
    pos = [a for a in args if not a.startswith("-")][:8]
    silencieux = any(a in ("--quiet", "-q") for a in args) or any(
        re.match(r"(?i)^CLOUDSDK_CORE_DISABLE_PROMPTS=(1|true)$", t) for t in toks)
    iv = next((k for k, a in enumerate(pos) if a in ("delete", "destroy") or (a == "rm" and k > 0 and pos[k - 1] == "storage")), -1)
    if iv >= 0:
        cmd = "gcloud " + " ".join(pos[:iv + 2])
        if any(a in GCLOUD_LARGE for a in pos[:iv]):
            return refus("« %s » supprime un projet, un dossier ou une organisation entière" % cmd)
        if silencieux: return refus("« %s » avec --quiet supprime sans aucune confirmation" % cmd)
        return demande("« %s » supprime des ressources Google Cloud" % cmd)
    if "remove-iam-policy-binding" in pos: return demande("« gcloud … remove-iam-policy-binding » retire des droits d'accès")
    if "rsync" in pos and "--delete-unmatched-destination-objects" in args:
        return demande("« gcloud storage rsync » avec --delete-unmatched-destination-objects supprime ce qui manque à la source")
    return None


def controle_gsutil(mot, args):
    pos = [a for a in args if not a.startswith("-")][:3]
    if mot == "bq":
        if "rm" not in pos: return None
        if any(a == "--force" or re.match(r"^-[a-z]*f[a-z]*$", a) for a in args):
            return refus("« bq rm -f » supprime sans aucune confirmation")
        return demande("« bq rm » supprime un jeu de données ou une table BigQuery")
    if "rm" in pos: return demande("« gsutil rm » supprime des objets du stockage, sans corbeille")
    if "rb" in pos: return demande("« gsutil rb » supprime un seau de stockage")
    if "rsync" in pos and any(re.match(r"^-[a-zA-Z]*d[a-zA-Z]*$", a) for a in args):
        return demande("« gsutil rsync -d » supprime ce qui manque à la source")
    return None


def controle_docker(mot, args):
    pos = [a for a in args if not a.startswith("-")]
    opts = [a for a in args if a.startswith("-")]
    suite = lambda a, b: any(p == a and k + 1 < len(pos) and pos[k + 1] in b for k, p in enumerate(pos))
    drapeau = lambda court, long: any(o == long or (not o.startswith("--") and court in o) for o in opts)
    if suite("system", ["prune"]):
        return demande("« %s system prune » supprime conteneurs arrêtés, réseaux et images inutilisés" % mot
                       + (", volumes compris" if "--volumes" in opts else ""))
    if suite("volume", ["rm", "remove", "prune"]):
        return demande("« %s volume rm/prune » supprime des volumes, donc leurs données" % mot)
    if suite("container", ["prune"]): return demande("« %s container prune » supprime tous les conteneurs arrêtés" % mot)
    if suite("image", ["prune"]) and drapeau("a", "--all"):
        return demande("« %s image prune -a » supprime toutes les images non utilisées" % mot)
    if (mot == "docker-compose" or "compose" in pos) and "down" in pos and drapeau("v", "--volumes"):
        return demande("« compose down -v » supprime aussi les volumes de la pile, donc ses données")
    return None


def positionnels(args):
    """Les arguments qui ne sont ni des options ni la valeur d'une option (« -n prod »)."""
    res, saute = [], False
    for a in args:
        if saute:
            saute = False
            if not a.startswith("-"): continue
        if a.startswith("-"):
            saute = a in AVEC_VALEUR; continue
        res.append(a)
    return res


def controle_kubectl(args):
    pos = positionnels(args)
    if pos[:1] != ["delete"]: return None
    opts = [a for a in args if a.startswith("-")]
    if any(re.match(r"^--dry-run(=(client|server|true))?$", o) for o in opts): return None
    types = {t.split("/")[0].lower() for c in pos[1:2] for t in c.split(",")} | {
        c.split("/")[0].lower() for c in pos[2:] if "/" in c}
    tout, partout = "--all" in opts, any(o in ("-A", "--all-namespaces") for o in opts)
    larges = types & (K_ESPACES | K_VOLUMES | K_DEFINITIONS)
    cmd = "kubectl delete " + " ".join(pos[1:3])
    if tout and (larges or partout):
        return refus("« %s --all%s » supprime en bloc %s" % (cmd.strip(), " -A" if partout else "",
                     "dans tous les espaces de noms" if partout and not larges else "des espaces de noms, des volumes ou des définitions de ressources"))
    if types & K_ESPACES:
        return demande("« %s » supprime l'espace de noms et tout ce qu'il contient, volumes compris" % cmd)
    if types & K_VOLUMES:
        return demande("« %s » supprime des volumes persistants : leurs données peuvent être perdues" % cmd)
    if types & K_DEFINITIONS:
        return demande("« %s » supprime une définition de ressource et toutes les ressources de ce type dans le cluster" % cmd)
    return demande("« %s » supprime des ressources du cluster%s" % (cmd.strip(), " (--all : toutes celles de ce type)" if tout else ""))


def controle_nuage(mot, args):
    """helm, flux, aws, az, rclone, mc, s3cmd, restic : suppressions de ressources, d'objets ou de sauvegardes."""
    pos = positionnels(args)
    sub = pos[0] if pos else ""
    opts = [a for a in args if a.startswith("-")]
    # Essai à blanc : rien n'est supprimé (« -n » ne l'annonce que chez restic, rclone et s3cmd)
    if any(o in ("--dry-run", "--dryrun") or o.startswith("--dry-run=") or (
            o == "-n" and mot in ("restic", "rclone", "s3cmd")) for o in opts): return None
    if mot == "helm" and sub in ("uninstall", "delete", "del", "un"):
        return demande("« helm %s » supprime la version installée et les ressources qu'elle a créées" % " ".join(pos[:2]))
    if mot == "flux" and sub in ("delete", "uninstall"):
        return demande("« flux %s » supprime des objets Flux ; ce qu'ils géraient peut partir avec eux" % " ".join(pos[:3]))
    if mot == "restic" and sub == "forget":
        return demande("« restic forget » retire des instantanés de la sauvegarde" + (
            " et, avec --prune, efface leurs données du dépôt" if "--prune" in opts else ""))
    if mot == "restic" and sub == "prune":
        return demande("« restic prune » efface du dépôt les données qui ne sont plus référencées : les instantanés oubliés deviennent irrécupérables")
    if mot == "aws":
        op = pos[1] if len(pos) > 1 else ""
        if sub == "s3" and op in ("rm", "rb"):
            return demande("« aws s3 %s » supprime %s, sans corbeille" % (op, "des objets du stockage" if op == "rm" else "un seau de stockage")
                           + (" (--recursive : tout ce qui est sous ce préfixe)" if "--recursive" in opts else "")
                           + (" (--force : avec tout son contenu)" if op == "rb" and "--force" in opts else ""))
        if sub == "s3" and op == "sync" and "--delete" in opts:
            return demande("« aws s3 sync --delete » supprime ce qui manque à la source")
        if re.match(r"^(delete|terminate)-[a-z0-9-]+$", op):
            return demande("« aws %s %s » supprime des ressources AWS" % (sub, op))
    if mot == "az":
        iv = next((k for k, a in enumerate(pos[:6]) if a == "delete" or a.startswith("delete-")), -1)
        if iv < 0: return None
        cmd = "az " + " ".join(pos[:iv + 1])
        if iv == 1 and sub == "group": return refus("« %s » supprime un groupe de ressources entier" % cmd)
        if any(o in ("--yes", "-y") for o in opts): return refus("« %s » avec --yes supprime sans aucune confirmation" % cmd)
        return demande("« %s » supprime des ressources Azure" % cmd)
    if mot == "rclone" and sub in ("delete", "deletefile", "purge", "rmdir", "rmdirs", "cleanup"):
        return demande("« rclone %s » supprime des fichiers du stockage distant, sans corbeille" % sub)
    if mot == "rclone" and sub == "sync":
        return demande("« rclone sync » supprime de la destination ce qui manque à la source")
    if mot in ("mc", "s3cmd") and sub in ("rm", "del", "rb"):
        return demande("« %s %s » supprime %s, sans corbeille" % (mot, sub, "un seau de stockage" if sub == "rb" else "des objets du stockage"))
    if (mot == "mc" and sub == "mirror" and "--remove" in opts) or (mot == "s3cmd" and sub == "sync" and "--delete-removed" in opts):
        return demande("« %s %s » avec suppression efface de la destination ce qui manque à la source" % (mot, sub))
    return None


def controle_http(mot, args):
    """Requête HTTP DELETE : elle supprime une ressource derrière l'API appelée."""
    methode = None
    if mot in ("curl", "wget"):
        for k, a in enumerate(args):
            m = (re.match(r"^-[a-zA-Z]*X(.*)$", a) if mot == "curl" else None) or re.match(
                r"^--(?:request|method)(?:=(.*))?$", a)
            if m: methode = m.group(1) or (args[k + 1] if k + 1 < len(args) else "")
    else:
        pos = positionnels(args)
        methode = pos[0] if pos else None
    if methode and methode.upper() == "DELETE":
        return demande("« %s » envoie une requête DELETE : la ressource visée est supprimée" % mot)
    return None


def controle_volumes(mot, args):
    pos = positionnels(args)
    if mot in ("zfs", "zpool"):
        if pos[:1] != ["destroy"] or any(re.match(r"^-[a-zA-Z]*n[a-zA-Z]*$", a) for a in args): return None
        return demande("« %s destroy » détruit %s : son contenu est perdu" % (
            mot, "le pool entier, avec tous ses jeux de données" if mot == "zpool" else "le jeu de données" +
            (" et tout ce qui en dépend" if any(re.match(r"^-[a-zA-Z]*[rR]", a) for a in args) else "")))
    return demande("« %s » supprime %s LVM : son contenu est perdu" % (
        mot, {"lvremove": "un volume logique", "vgremove": "un groupe de volumes", "pvremove": "un volume physique"}[mot]))


def git(rep, *args):
    try:
        r = subprocess.run(["git", "-C", rep] + list(args), capture_output=True, text=True, errors="replace", timeout=8)
        return r.stdout if r.returncode == 0 else ""
    except Exception:
        return ""


def controle_git(args, ici):
    rep, i = REP[0], 0
    while i < len(args) and args[i].startswith("-"):
        if args[i] == "-C" and i + 1 < len(args):
            rep = os.path.normpath(os.path.join(rep, os.path.expanduser(args[i + 1]))); i += 2; continue
        i += 2 if args[i] == "-c" else 1
    if i >= len(args): return None
    sub, reste = args[i], args[i + 1:]
    opts = [a for a in reste if a.startswith("-")]
    pos = [a for a in reste if not a.startswith("-")]
    court = lambda c: any(not o.startswith("--") and c in o for o in opts)
    if sub == "push":
        refs = pos[1:]
        force = (court("f") or any(o == "--force" or o.startswith("--force-with-lease") or o == "--mirror" for o in opts)
                 or any(r.startswith("+") for r in refs))
        supprime = court("d") or "--delete" in opts or "--prune" in opts or any(r.startswith(":") for r in refs)
        if not force and not supprime: return None
        cibles = [re.sub(r"^refs/heads/", "", r.lstrip("+").split(":")[-1]) for r in refs]
        if (not cibles or "HEAD" in cibles) and ici:
            courante = git(rep, "rev-parse", "--abbrev-ref", "HEAD").strip()
            if courante: cibles.append(courante)
        principale = next((c for c in cibles if PRINCIPALE.match(c)), None)
        if principale:
            return refus("« git push --force » sur %s réécrit l'historique de la branche principale" % principale if force
                         else "« git push --delete » supprimerait la branche principale %s" % principale)
        return demande("« git push --force » réécrit l'historique distant : les commits écrasés sont perdus" if force
                       else "« git push --delete » supprime une branche ou une étiquette du dépôt distant")
    if sub == "reset" and "--hard" in opts: return demande("« git reset --hard » efface les modifications non commitées")
    if sub == "clean" and (court("f") or "--force" in opts) and not (court("n") or "--dry-run" in opts):
        return demande("« git clean -f » supprime définitivement les fichiers non suivis")
    if sub == "branch" and (court("D") or ((court("d") or "--delete" in opts) and (court("f") or "--force" in opts))):
        return demande("« git branch -D » supprime une branche même non fusionnée")
    if sub == "stash" and pos[:1] == ["clear"]: return demande("« git stash clear » supprime toutes les remises")
    return None


def controle(mot, args, toks, ici):
    if mot in TERRAFORM: return controle_terraform(mot, args, toks)
    if mot == "gcloud": return controle_gcloud(args, toks)
    if mot in ("gsutil", "bq"): return controle_gsutil(mot, args)
    if mot == "git": return controle_git(args, ici)
    if mot == "rm" or (POWERSHELL[0] and mot in SUPPRESSION_PS): return controle_rm(mot, args)
    if mot == "find": return controle_find(args)
    if mot in DOCKER: return controle_docker(mot, args)
    if mot == "kubectl": return controle_kubectl(args)
    if mot in NUAGE: return controle_nuage(mot, args)
    if mot in HTTP: return controle_http(mot, args)
    if mot in VOLUMES: return controle_volumes(mot, args)
    return controle_disque(mot, args)


def analyser(brut, profondeur=0, local=True):
    """Tout ce que la commande détruirait : liste de (niveau, raison)."""
    if profondeur > 4: return []
    res = []
    cmd = sans_texte_libre(brut)
    for sub in substitutions(cmd):
        res += analyser(sub, profondeur + 1, local)
    sans_sub = re.sub(r"\$\((?:[^()]|\([^()]*\))*\)", "SUBST", cmd)
    for seg in decouper(sans_sub, ["&&", "||", ";", "\n"]):
        for etape in decouper(seg, ["|", "&"]):
            toks = mots(etape)
            i = next((k for k, t in enumerate(toks) if not AFFECTATION.match(t) and t not in MOTS_CLES), None)
            if i is None: continue
            mot0, args0 = nom(toks[i]), toks[i + 1:]
            sur_place = local and mot0 not in LANCEURS_DISTANTS
            if mot0 == "cd" and args0 and local:
                REP[0] = os.path.normpath(os.path.join(REP[0], os.path.expanduser(args0[0])))
            for niveau, motif in REGLES:
                if motif.search(" ".join(toks[i:])): res.append((niveau, "règle personnelle « %s »" % motif.pattern))
            # Chaînes qu'un autre shell exécutera : ssh '…', sh -c '…', eval '…'.
            if mot0 == "ssh":
                for d in [a for a in args0 if re.search(r"[\s;|&]", a)][-1:]:
                    res += analyser(d, profondeur + 1, False)
            if mot0 == "eval": res += analyser(" ".join(args0), profondeur + 1, local)
            if mot0 != "git":
                for k in range(len(args0) - 1):
                    avant = mot0 if k == 0 else nom(args0[k - 1])
                    if args0[k] == "-c" or (avant in SHELLS and re.match(r"^-[a-z]{1,3}c$", args0[k])):
                        res += analyser(args0[k + 1], profondeur + 1, sur_place)
            # La commande elle-même, puis celles qu'elle lance (sudo rm…, docker exec … rm…, ssh hôte rm…).
            candidats = [i]
            if mot0 in LANCEURS_LOCAUX or mot0 in LANCEURS_DISTANTS:
                for k in range(i + 1, len(toks)):
                    t = toks[k]
                    if est_surveillee(nom(t) if t.startswith("/") else t.lower() if POWERSHELL[0] else t): candidats.append(k)
            for k in candidats:
                v = controle(nom(toks[k]), toks[k + 1:], toks, local if k == i else sur_place)
                if v: res.append(v)
    return res


def decider(cmd):
    """Ce que le garde pense d'une commande : (niveau, raison), ou None."""
    try:
        verdicts = analyser(cmd)
    except Exception:
        # En cas de doute (analyse impossible) : confirmation si une commande surveillée côtoie un verbe de destruction.
        tous = re.findall(r"[^\s'\";|&()<>]+", cmd)
        douteux = any(est_surveillee(nom_commande(m)) for m in tous) and any(
            re.match(r"^(destroy|delete|rm|prune|-[a-zA-Z]*[rf][a-zA-Z]*|--force|--hard)$", m) for m in tous)
        verdicts = [demande("commande non analysable qui semble destructrice")] if douteux else []
    grave = next((v for v in verdicts if v[0] == "refus"), None)
    if grave: return grave
    if not verdicts: return None
    raisons = list(dict.fromkeys(r for _, r in verdicts))
    return demande(" ; ".join(raisons[:3]) + (" ; … (%d autres)" % (len(raisons) - 3) if len(raisons) > 3 else ""))


def repondre(niveau, raison):
    if niveau == "refus":
        texte = ("garde-destruction : " + raison + ". Commande refusée : elle détruit trop large, ou sans confirmation possible. "
                 "Ne contourne pas ce refus : dis à l'utilisateur ce qui a été refusé. S'il veut vraiment cette opération, "
                 "c'est à lui de la lancer dans son terminal, ou de désactiver le plugin garde-destruction.")
    else:
        texte = "garde-destruction : " + raison + ". À confirmer par l'utilisateur."
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse", "permissionDecision": "deny" if niveau == "refus" else "ask",
        "permissionDecisionReason": texte}}))
    sys.exit(0)


def main():
    try:
        ev = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    outil, entree = ev.get("tool_name", ""), ev.get("tool_input", {}) or {}
    if outil not in ("Bash", "PowerShell"): sys.exit(0)
    if ev.get("cwd"): REP[0] = ev["cwd"]
    cmd = entree.get("command", "")
    if not isinstance(cmd, str): sys.exit(0)
    if outil == "PowerShell":
        POWERSHELL[0] = True
        cmd = cmd.replace("\\", "/")  # l'antislash n'y est pas un échappement
    v = decider(cmd)
    if v: repondre(*v)
    sys.exit(0)


if __name__ == "__main__":
    main()
